import { randomUUID } from "crypto";
import { ValidationError, type Payload, type Where } from "payload";

import { writeAuditLog } from "@/lib/audit";
import {
	sendEoiBatchSentEmail,
	sendEoiNudgeEmail,
	sendEoiReceivedEmail,
	sendEoiRespondedEmail,
	sendEoiResponseConfirmedEmail,
} from "@/lib/email";
import {
	loadProfileDisplay,
	loadSenderInfo,
	loadUserName,
	toId,
	userLabel,
} from "@/lib/payload-helpers";
import { loadUserEmail } from "@/lib/user-email";
import type { ExpressionsOfInterest, User, WajakaziProfile } from "@/payload-types";
import { DIRECTORY_VISIBLE } from "@/payload/access/access-control";
import { grantContactFromEoi } from "@/services/contact.service";
import { getOwnProfile } from "@/services/profile.service";
import { getEoiPolicy, type EoiPolicy } from "@/services/settings.service";
import { getOwnSubscription } from "@/services/subscription.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type EoiState = NonNullable<ExpressionsOfInterest["state"]>;
type EoiResponse = Extract<EoiState, "accepted" | "rejected">;

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

// the unique `pendingKey` index makes a concurrent duplicate send fail with a
// validation error rather than a second outstanding record for the same pair
const isDuplicatePendingKeyError = (error: unknown): boolean =>
	error instanceof ValidationError &&
	Boolean(error.data?.errors?.some((fieldError) => fieldError.path === "pendingKey"));

// every eoi in a batch that still has at least one unanswered member. a batch
// leaves the pool once all of its members are resolved, so the pool cannot grow
// without bound — an unanswered interest expires, and expiry resolves it
type OpenPool = { resolved: number; total: number };

// only the fields the pool needs; selecting keeps the read cheap and the type
// mirrors what the query returns
type PoolRow = Pick<ExpressionsOfInterest, "id" | "batchId" | "state">;

type SendEligibility = {
	allowed: boolean;
	code: "forbidden" | "subscription_required" | "gate_blocked" | null;
	reason: string | null;
	policy: EoiPolicy;
	pool: OpenPool;
};

type InterestBlockCode = SendEligibility["code"] | "cooldown" | "granted" | "hired";

type ProfileInterestStatus = {
	state: EoiState | "none";
	canSend: boolean;
	blockReason: string | null;
	blockCode: InterestBlockCode | null;
};

const loadOpenPool = async (payload: Payload, mwajiriId: string): Promise<OpenPool> => {
	const result = await payload.find({
		collection: "expressions-of-interest",
		where: { mwajiri: { equals: mwajiriId } },
		limit: 1000,
		depth: 0,
		select: { state: true, batchId: true },
		overrideAccess: true,
	});

	// group by batch; a record without a batchId is its own batch
	const batches = new Map<string, PoolRow[]>();
	for (const doc of result.docs) {
		const key = doc.batchId ?? doc.id;
		const group = batches.get(key);
		if (group) group.push(doc);
		else batches.set(key, [doc]);
	}

	let resolved = 0;
	let total = 0;
	for (const group of batches.values()) {
		if (!group.some((doc) => doc.state === "sent")) continue;
		total += group.length;
		resolved += group.filter((doc) => doc.state !== "sent").length;
	}

	return { resolved, total };
};

// "more than X% of the open pool resolved" — the anti-firehose gate. an empty
// pool always passes, so a first batch is never blocked
const gateBlocks = (pool: OpenPool, thresholdPercent: number): boolean =>
	pool.total > 0 && pool.resolved * 100 <= pool.total * thresholdPercent;

// whether any of the given profiles is still inside the re-send cooldown, i.e. a
// rejection or expiry resolved within the window
const findCoolingDown = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziIds: string[],
	cooldownDays: number,
): Promise<boolean> => {
	if (cooldownDays <= 0) return false;

	const cutoff = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();

	const result = await payload.find({
		collection: "expressions-of-interest",
		where: {
			and: [
				{ mwajiri: { equals: mwajiriId } },
				{ mjakazi: { in: mjakaziIds } },
				{ state: { in: ["rejected", "expired"] } },
				{
					// a rejection stamps respondedAt; an expiry only stamps updatedAt
					or: [
						{ respondedAt: { greater_than_equal: cutoff } },
						{ updatedAt: { greater_than_equal: cutoff } },
					],
				},
			],
		},
		limit: 1,
		depth: 0,
		overrideAccess: true,
	});

	return result.docs.length > 0;
};

// whether any recipient already holds a contact grant — interest would add nothing
const findGranted = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziIds: string[],
): Promise<boolean> => {
	const result = await payload.find({
		collection: "contact-unlocks",
		where: {
			and: [{ mwajiri: { equals: mwajiriId } }, { mjakazi: { in: mjakaziIds } }],
		},
		limit: 1,
		depth: 0,
		overrideAccess: true,
	});
	return result.docs.length > 0;
};

// whether any recipient is already in a live hire with this mwajiri
const findHired = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziIds: string[],
): Promise<boolean> => {
	const result = await payload.find({
		collection: "hires",
		where: {
			and: [
				{ mwajiri: { equals: mwajiriId } },
				{ mjakazi: { in: mjakaziIds } },
				{ state: { in: ["pending_agreement", "agreed"] } },
			],
		},
		limit: 1,
		depth: 0,
		overrideAccess: true,
	});
	return result.docs.length > 0;
};

// whether the mwajiri may open a new batch at all, ignoring which wajakazi are
// selected. the UI reads this to explain a blocked send before the mwajiri picks
const getEoiSendEligibility = async (
	payload: Payload,
	user: User,
): Promise<SendEligibility> => {
	const policy = await getEoiPolicy(payload);
	const empty = { resolved: 0, total: 0 };

	if (user.role !== "mwajiri") {
		return {
			allowed: false,
			code: "forbidden",
			reason: blockReasonFor("forbidden"),
			policy,
			pool: empty,
		};
	}

	const subscription = await getOwnSubscription(payload, user);
	if (!subscription || subscription.subscriptionState !== "active") {
		return {
			allowed: false,
			code: "subscription_required",
			reason: blockReasonFor("subscription_required"),
			policy,
			pool: empty,
		};
	}

	const pool = await loadOpenPool(payload, user.id);
	if (gateBlocks(pool, policy.responseThresholdPercent)) {
		return {
			allowed: false,
			code: "gate_blocked",
			reason: blockReasonFor("gate_blocked"),
			policy,
			pool,
		};
	}

	return { allowed: true, code: null, reason: null, policy, pool };
};

// a mwajiri's relationship with one profile, for the browse detail's contact
// area: the newest interest on the pair, whether a new one may be sent now, and
// why not. `blockCode` lets the card choose between a subscribe call to action
// and a plain explanation
const blockReasonFor = (code: SendEligibility["code"]): string | null => {
	switch (code) {
		case "subscription_required":
			return "An active subscription is required to send interest.";
		case "gate_blocked":
			return "Respond to your open interests before sending a new one.";
		case "forbidden":
			return "Only a mwajiri account can send interest.";
		default:
			return null;
	}
};

const getProfileInterestStatus = async (
	payload: Payload,
	user: User,
	mjakaziId: string,
): Promise<ProfileInterestStatus> => {
	const eligibility = await getEoiSendEligibility(payload, user);
	if (!eligibility.allowed) {
		return {
			state: "none",
			canSend: false,
			blockReason: eligibility.reason,
			blockCode: eligibility.code,
		};
	}

	const latest = await payload.find({
		collection: "expressions-of-interest",
		where: {
			and: [{ mwajiri: { equals: user.id } }, { mjakazi: { equals: mjakaziId } }],
		},
		limit: 1,
		depth: 0,
		sort: "-sentAt",
		select: { state: true },
		overrideAccess: true,
	});
	const state = latest.docs[0]?.state ?? "none";

	// an open or already-accepted interest needs no new send
	if (state === "sent" || state === "accepted") {
		return { state, canSend: false, blockReason: null, blockCode: null };
	}

	if (await findHired(payload, user.id, [mjakaziId])) {
		return {
			state,
			canSend: false,
			blockReason: "You are already in a hire with this mjakazi.",
			blockCode: "hired",
		};
	}

	if (
		await findCoolingDown(
			payload,
			user.id,
			[mjakaziId],
			eligibility.policy.resendCooldownDays,
		)
	) {
		return {
			state,
			canSend: false,
			blockReason: `You approached this mjakazi recently. You can send again after the ${eligibility.policy.resendCooldownDays}-day cooldown.`,
			blockCode: "cooldown",
		};
	}

	// a granted pair needs no interest — the contact is already there
	if (await findGranted(payload, user.id, [mjakaziId])) {
		return { state, canSend: false, blockReason: null, blockCode: "granted" };
	}

	return { state, canSend: true, blockReason: null, blockCode: null };
};

// the mjakazi ids a mwajiri cannot send a new interest to — an outstanding
// (sent/accepted) interest, an existing grant, or a live hire. the saved page
// reads this so its selector holds only profiles the batch would accept
const listUnavailableForInterest = async (
	payload: Payload,
	mwajiriId: string,
): Promise<Set<string>> => {
	const [eois, grants, hires] = await Promise.all([
		payload.find({
			collection: "expressions-of-interest",
			where: {
				and: [
					{ mwajiri: { equals: mwajiriId } },
					{ state: { in: ["sent", "accepted"] } },
				],
			},
			limit: 1000,
			depth: 0,
			select: { mjakazi: true },
			overrideAccess: true,
		}),
		payload.find({
			collection: "contact-unlocks",
			where: { mwajiri: { equals: mwajiriId } },
			limit: 1000,
			depth: 0,
			select: { mjakazi: true },
			overrideAccess: true,
		}),
		payload.find({
			collection: "hires",
			where: {
				and: [
					{ mwajiri: { equals: mwajiriId } },
					{ state: { in: ["pending_agreement", "agreed"] } },
				],
			},
			limit: 1000,
			depth: 0,
			select: { mjakazi: true },
			overrideAccess: true,
		}),
	]);

	const ids = new Set<string>();
	for (const doc of [...eois.docs, ...grants.docs, ...hires.docs]) {
		const id = toId(doc.mjakazi);
		if (id) ids.add(id);
	}
	return ids;
};

// sends a batch of expressions of interest. the mwajiri must hold an active
// subscription; every recipient must still be directory-visible; no outstanding
// (sent/accepted) interest, existing contact grant or live hire may already exist
// for a recipient; the open-pool gate must have cleared; and no recipient may
// still be inside the re-send cooldown. the batch is created atomically enough —
// each eoi is its own record — and one audit entry + one email fire per recipient
const sendEoiBatch = async (
	payload: Payload,
	actor: User,
	mjakaziIds: string[],
): Promise<Result<{ batchId: string; sent: number }>> => {
	if (actor.role !== "mwajiri") return fail("Forbidden", "forbidden");

	const policy = await getEoiPolicy(payload);

	const ids = [...new Set(mjakaziIds)];
	if (ids.length < policy.minBatch || ids.length > policy.maxBatch) {
		return fail(
			`Select between ${policy.minBatch} and ${policy.maxBatch} wajakazi.`,
			"invalid_batch_size",
		);
	}

	const subscription = await getOwnSubscription(payload, actor);
	if (!subscription || subscription.subscriptionState !== "active") {
		return fail(
			"An active subscription is required to send interest.",
			"subscription_required",
		);
	}

	// only live, directory-visible profiles can receive interest — read through
	// access control so a profile that has since left the directory cannot be hit
	const profilesResult = await payload.find({
		collection: "wajakazi-profiles",
		where: { and: [DIRECTORY_VISIBLE, { id: { in: ids } }] },
		limit: ids.length,
		depth: 0,
		select: { user: true, displayName: true },
		overrideAccess: false,
		req: { user: actor },
	});

	if (profilesResult.docs.length !== ids.length) {
		return fail("One or more wajakazi are no longer available.", "not_found");
	}

	const outstanding = await payload.find({
		collection: "expressions-of-interest",
		where: {
			and: [
				{ mwajiri: { equals: actor.id } },
				{ mjakazi: { in: ids } },
				{ state: { in: ["sent", "accepted"] } },
			],
		},
		limit: 1,
		depth: 0,
		overrideAccess: true,
	});

	if (outstanding.docs.length > 0) {
		return fail(
			"You already have a pending interest with one or more of these wajakazi.",
			"already_sent",
		);
	}

	const pool = await loadOpenPool(payload, actor.id);
	if (gateBlocks(pool, policy.responseThresholdPercent)) {
		return fail(
			"Respond to your open interests before sending a new batch.",
			"gate_blocked",
		);
	}

	if (await findCoolingDown(payload, actor.id, ids, policy.resendCooldownDays)) {
		return fail(
			`You approached one or more of these wajakazi recently. Try again after the ${policy.resendCooldownDays}-day cooldown.`,
			"cooldown_active",
		);
	}

	if (await findGranted(payload, actor.id, ids)) {
		return fail(
			"You already have the contact details for one or more of these wajakazi.",
			"already_unlocked",
		);
	}

	if (await findHired(payload, actor.id, ids)) {
		return fail(
			"You are already in a hire with one or more of these wajakazi.",
			"already_hired",
		);
	}

	const batchId = randomUUID();
	const sentAt = new Date().toISOString();
	const created: ExpressionsOfInterest[] = [];

	try {
		for (const profile of profilesResult.docs) {
			created.push(
				await payload.create({
					collection: "expressions-of-interest",
					data: {
						mwajiri: actor.id,
						mjakazi: profile.id,
						batchId,
						state: "sent",
						sentAt,
						pendingKey: `${actor.id}:${profile.id}`,
					},
					overrideAccess: true,
				}),
			);
		}
	} catch (error) {
		if (isDuplicatePendingKeyError(error)) {
			// a concurrent send already created an outstanding interest for one of
			// these pairs — roll back this batch's records so a batch is all-or-nothing
			for (const doc of created) {
				await payload
					.delete({
						collection: "expressions-of-interest",
						id: doc.id,
						overrideAccess: true,
					})
					.catch(() => {});
			}
			return fail(
				"You already have a pending interest with one or more of these wajakazi.",
				"already_sent",
			);
		}
		throw error;
	}

	for (const profile of profilesResult.docs) {
		const recipientUserId = toId(profile.user);
		await writeAuditLog({
			action: "eoi_sent",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: recipientUserId,
			targetLabel: profile.displayName ?? null,
			previousState: null,
			newState: "sent",
			metadata: { batchId, mjakaziProfileId: profile.id },
			source: "user",
		});
	}

	await notifyBatchSent(payload, actor, profilesResult.docs, ids.length);

	return { success: true, data: { batchId, sent: created.length } };
};

// fire-and-forget notifications for a sent batch: one "you received interest"
// email per recipient, plus a batch summary to the sender. the creates have
// already committed, so a failed send never rolls the batch back
const notifyBatchSent = async (
	payload: Payload,
	actor: User,
	profiles: { user: string | User | null; displayName?: string | null; id: string }[],
	count: number,
): Promise<void> => {
	const senderName = userLabel(actor);

	try {
		for (const profile of profiles) {
			const userId = toId(profile.user);
			if (!userId) continue;
			const recipient = await loadUserEmail(payload, userId);
			if (!recipient) continue;
			await sendEoiReceivedEmail({
				payload,
				to: recipient.email,
				firstName: recipient.firstName,
				mwajiriName: senderName,
			});
		}
	} catch (error) {
		console.error("[services/eoi] recipient notification email failed:", error);
	}

	try {
		await sendEoiBatchSentEmail({
			payload,
			to: actor.email,
			firstName: actor.firstName ?? "there",
			count,
		});
	} catch (error) {
		console.error("[services/eoi] batch confirmation email failed:", error);
	}
};

// the interest a mwajiri has sent, most recent first, for the dashboard
const listSentEois = async (
	payload: Payload,
	user: User,
): Promise<
	Array<{
		id: string;
		mjakaziId: string;
		mjakaziName: string;
		mjakaziSlug: string | null;
		state: EoiState;
		sentAt: string | null;
		respondedAt: string | null;
	}>
> => {
	if (user.role !== "mwajiri") return [];

	const result = await payload.find({
		collection: "expressions-of-interest",
		where: { mwajiri: { equals: user.id } },
		limit: 100,
		depth: 0,
		sort: "-sentAt",
		select: { mjakazi: true, state: true, sentAt: true, respondedAt: true },
		overrideAccess: true,
	});

	const profileIds = result.docs
		.map((doc) => toId(doc.mjakazi))
		.filter((id): id is string => id !== null);
	const display = await loadProfileDisplay(payload, profileIds);

	return result.docs.map((doc) => {
		const profileId = toId(doc.mjakazi) ?? "";
		return {
			id: doc.id,
			mjakaziId: profileId,
			mjakaziName: display.get(profileId)?.displayName ?? "Mjakazi",
			mjakaziSlug: display.get(profileId)?.slug ?? null,
			state: doc.state,
			sentAt: doc.sentAt ?? null,
			respondedAt: doc.respondedAt ?? null,
		};
	});
};

// the interest a mjakazi has received, most recent first, for the opportunities
// screen. sender name + location are resolved for display; no contact is exposed
const listReceivedEois = async (
	payload: Payload,
	user: User,
): Promise<
	Array<{
		id: string;
		mwajiriName: string;
		mwajiriLocation: string | null;
		state: EoiState;
		sentAt: string | null;
		respondedAt: string | null;
	}>
> => {
	if (user.role !== "mjakazi") return [];

	const profile = await getOwnProfile(payload, user);
	if (!profile) return [];

	const result = await payload.find({
		collection: "expressions-of-interest",
		where: { mjakazi: { equals: profile.id } },
		limit: 100,
		depth: 0,
		sort: "-sentAt",
		select: { mwajiri: true, state: true, sentAt: true, respondedAt: true },
		overrideAccess: true,
	});

	const senderIds = result.docs
		.map((doc) => toId(doc.mwajiri))
		.filter((id): id is string => id !== null);
	const senders = await loadSenderInfo(payload, senderIds);

	return result.docs.map((doc) => {
		const senderId = toId(doc.mwajiri) ?? "";
		return {
			id: doc.id,
			mwajiriName: senders.get(senderId)?.name ?? "An employer",
			mwajiriLocation: senders.get(senderId)?.location ?? null,
			state: doc.state,
			sentAt: doc.sentAt ?? null,
			respondedAt: doc.respondedAt ?? null,
		};
	});
};

// accepts or rejects an expression of interest. the mjakazi may only respond to
// interest addressed to them, and only once — a sent interest is a compare-and-
// swap to the response, so a double response is refused
const respondToEoi = async (
	payload: Payload,
	actor: User,
	eoiId: string,
	response: EoiResponse,
): Promise<Result<ExpressionsOfInterest>> => {
	if (actor.role !== "mjakazi") return fail("Forbidden", "forbidden");

	const profile = await getOwnProfile(payload, actor);
	if (!profile) return fail("Profile not found.", "not_found");

	const eoi = await payload.findByID({
		collection: "expressions-of-interest",
		id: eoiId,
		depth: 0,
		overrideAccess: true,
	});
	if (!eoi) return fail("Interest not found.", "not_found");
	if (toId(eoi.mjakazi) !== profile.id) return fail("Forbidden", "forbidden");
	if (eoi.state !== "sent") {
		return fail("You have already responded to this interest.", "already_responded");
	}

	const mwajiriId = toId(eoi.mwajiri);
	if (response === "accepted" && !mwajiriId) {
		return fail("Interest is missing its sender.", "not_found");
	}

	// create the durable contact grant first, so an acceptance never lands without
	// the contact it promises. it is rolled back below if the compare-and-swap
	// loses its race, and it is idempotent, so a pair already granted costs nothing
	let grantId: string | null = null;
	if (response === "accepted" && mwajiriId) {
		const granted = await grantContactFromEoi(payload, mwajiriId, profile.id, eoi.id);
		if (!granted.success) return fail(granted.error, "grant_failed");
		grantId = granted.data.grantId;
	}

	try {
		const result = await payload.update({
			collection: "expressions-of-interest",
			where: {
				and: [{ id: { equals: eoi.id } }, { state: { equals: "sent" } }],
			},
			data: {
				state: response,
				respondedAt: new Date().toISOString(),
				// a rejection frees the pair key; re-approaching is then governed by the
				// cooldown in sendEoiBatch. an acceptance keeps it, blocking a re-send
				...(response === "rejected"
					? { pendingKey: `${mwajiriId ?? "unknown"}:${profile.id}:${eoi.id}` }
					: {}),
			},
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			// the acceptance lost its race — remove the grant it pre-created so the
			// pair is not granted without an accepted interest
			if (grantId) {
				await payload
					.delete({
						collection: "contact-unlocks",
						id: grantId,
						overrideAccess: true,
					})
					.catch(() => {});
			}
			return fail("Interest changed. Please refresh and try again.", "conflict");
		}

		const mwajiriName = mwajiriId ? await loadUserName(payload, mwajiriId) : null;

		await writeAuditLog({
			action: "eoi_responded",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: mwajiriId,
			targetLabel: mwajiriName,
			previousState: "sent",
			newState: response,
			metadata: { batchId: eoi.batchId ?? null, mjakaziProfileId: profile.id },
			source: "user",
		});

		if (grantId && mwajiriId) {
			await writeAuditLog({
				action: "contact_granted",
				actorId: actor.id,
				actorLabel: userLabel(actor),
				targetId: mwajiriId,
				targetLabel: mwajiriName,
				previousState: null,
				newState: "granted",
				metadata: { eoiId: eoi.id, mjakaziProfileId: profile.id, grantId },
				source: "user",
			});
		}

		await notifyResponse(payload, actor, profile, mwajiriId, mwajiriName, response);

		return { success: true, data: result.docs[0] };
	} catch (error) {
		console.error("[services/eoi] respond failed:", error);
		return fail("Could not respond to this interest.");
	}
};

// fire-and-forget response notifications: the mwajiri learns the outcome, and the
// mjakazi gets a confirmation. the transition is already committed by now
const notifyResponse = async (
	payload: Payload,
	actor: User,
	profile: WajakaziProfile,
	mwajiriId: string | null,
	mwajiriName: string | null,
	response: EoiResponse,
): Promise<void> => {
	const mjakaziName = profile.displayName ?? userLabel(actor);

	if (mwajiriId) {
		try {
			const recipient = await loadUserEmail(payload, mwajiriId);
			if (recipient) {
				await sendEoiRespondedEmail({
					payload,
					to: recipient.email,
					firstName: recipient.firstName,
					mjakaziName,
					response,
				});
			}
		} catch (error) {
			console.error("[services/eoi] response notification email failed:", error);
		}
	}

	try {
		await sendEoiResponseConfirmedEmail({
			payload,
			to: actor.email,
			firstName: actor.firstName ?? "there",
			mwajiriName: mwajiriName ?? "the employer",
			response,
		});
	} catch (error) {
		console.error("[services/eoi] response confirmation email failed:", error);
	}
};

// the 3- and 5-day windows after an accepted interest, one nudge each. the
// array index is the number of nudges already sent, so `NUDGE_WINDOWS_MS[0]` is
// the first nudge (3 days) and `[1]` the second (5 days)
const NUDGE_WINDOWS_MS = [3, 5].map((days) => days * 24 * 60 * 60 * 1000);

// trusted read of a mjakazi profile's owner + display name for the nudge email.
// an explicit select keeps contact and identity fields out of this read
const loadMjakaziOwner = async (
	payload: Payload,
	profileId: string,
): Promise<{
	user?: string | { id?: string | number } | null;
	displayName?: string | null;
} | null> => {
	try {
		const result = await payload.find({
			collection: "wajakazi-profiles",
			where: { id: { equals: profileId } },
			limit: 1,
			depth: 0,
			select: { user: true, displayName: true },
			overrideAccess: true,
		});
		const doc = result.docs[0];
		if (!doc) return null;
		return { user: doc.user, displayName: doc.displayName };
	} catch {
		return null;
	}
};

// whether a non-reversed hire already exists for the pair — the nudge's question
// ("did it result in a hire?") is then answered, so it is skipped
const hasActiveHire = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
): Promise<boolean> => {
	try {
		const result = await payload.find({
			collection: "hires",
			where: {
				and: [
					{ mwajiri: { equals: mwajiriId } },
					{ mjakazi: { equals: mjakaziId } },
					{ state: { in: ["pending_agreement", "agreed"] } },
				],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		return result.docs.length > 0;
	} catch {
		return false;
	}
};

// compare-and-swap one nudge onto an accepted interest. `count` is the number of
// nudges already sent (0 or 1); the where-clause pins that exact count so a
// concurrent run cannot double-apply. `exists: false` covers pre-8.3 accepted
// records that predate the `nudgesSent` field
const applyNudge = async (
	payload: Payload,
	eoi: ExpressionsOfInterest,
	count: number,
): Promise<boolean> => {
	const countClause: Where =
		count === 0
			? { or: [{ nudgesSent: { equals: 0 } }, { nudgesSent: { exists: false } }] }
			: { or: [{ nudgesSent: { equals: 1 } }] };

	try {
		const result = await payload.update({
			collection: "expressions-of-interest",
			where: {
				and: [{ id: { equals: eoi.id } }, { state: { equals: "accepted" } }, countClause],
			},
			data: { nudgesSent: count + 1, lastNudgedAt: new Date().toISOString() },
			overrideAccess: true,
		});
		return result.docs.length > 0;
	} catch (error) {
		console.error("[services/eoi] nudge CAS failed:", error);
		return false;
	}
};

// fire-and-forget: one email to each party plus a system audit entry. the
// nudge counter is already committed, so a failed send never re-nudges
const notifyNudge = async (
	payload: Payload,
	eoi: ExpressionsOfInterest,
	nudgeNumber: number,
): Promise<void> => {
	const mwajiriId = toId(eoi.mwajiri);
	const mjakaziId = toId(eoi.mjakazi);
	if (!mwajiriId || !mjakaziId) return;

	const mwajiriName = (await loadUserName(payload, mwajiriId)) ?? "the employer";
	const profile = await loadMjakaziOwner(payload, mjakaziId);
	const mjakaziName = profile?.displayName ?? "the mjakazi";
	const mjakaziOwnerId = profile ? toId(profile.user) : null;

	await writeAuditLog({
		action: "eoi_nudged",
		targetId: mwajiriId,
		targetLabel: mwajiriName,
		metadata: { eoiId: eoi.id, mjakaziProfileId: mjakaziId, nudgeNumber },
		source: "system",
	});

	try {
		const mwajiri = await loadUserEmail(payload, mwajiriId);
		if (mwajiri) {
			await sendEoiNudgeEmail({
				payload,
				to: mwajiri.email,
				firstName: mwajiri.firstName,
				otherPartyName: mjakaziName,
				role: "mwajiri",
			});
		}
	} catch (error) {
		console.error("[services/eoi] nudge mwajiri email failed:", error);
	}

	if (!mjakaziOwnerId) return;
	try {
		const mjakazi = await loadUserEmail(payload, mjakaziOwnerId);
		if (mjakazi) {
			await sendEoiNudgeEmail({
				payload,
				to: mjakazi.email,
				firstName: mjakazi.firstName,
				otherPartyName: mwajiriName,
				role: "mjakazi",
			});
		}
	} catch (error) {
		console.error("[services/eoi] nudge mjakazi email failed:", error);
	}
};

// polled daily by the 8.3 nudge job. finds accepted interests whose next nudge
// window has elapsed and nudges each idempotently (two nudges, then silence).
// a missed window self-corrects on the next run because the query polls for
// eligible records rather than relying on being woken at the right moment
const sendAcceptedEoiNudges = async (payload: Payload): Promise<{ nudged: number }> => {
	const now = Date.now();

	let candidates: ExpressionsOfInterest[];
	try {
		const result = await payload.find({
			collection: "expressions-of-interest",
			where: { state: { equals: "accepted" } },
			limit: 200,
			depth: 0,
			overrideAccess: true,
		});
		candidates = result.docs;
	} catch (error) {
		console.error("[services/eoi] nudge lookup failed:", error);
		return { nudged: 0 };
	}

	let nudged = 0;

	for (const eoi of candidates) {
		if (!eoi.respondedAt) continue;

		const count = eoi.nudgesSent ?? 0;
		if (count >= 2) continue;

		const elapsed = now - new Date(eoi.respondedAt).getTime();
		if (elapsed < NUDGE_WINDOWS_MS[count]) continue;

		const mwajiriId = toId(eoi.mwajiri);
		const mjakaziId = toId(eoi.mjakazi);
		if (!mwajiriId || !mjakaziId) continue;

		if (await hasActiveHire(payload, mwajiriId, mjakaziId)) continue;

		const applied = await applyNudge(payload, eoi, count);
		if (!applied) continue;

		await notifyNudge(payload, eoi, count + 1);
		nudged += 1;
	}

	return { nudged };
};

// compare-and-swap one unanswered interest to expired. the where-clause pins
// `state === "sent"` so a response or a concurrent run cannot double-apply; the
// pendingKey is uniquified (rejection-style) so the pair can be re-sent later
const expireEoi = async (
	payload: Payload,
	eoi: ExpressionsOfInterest,
): Promise<boolean> => {
	const mwajiriId = toId(eoi.mwajiri);
	const mjakaziId = toId(eoi.mjakazi);

	try {
		const result = await payload.update({
			collection: "expressions-of-interest",
			where: {
				and: [{ id: { equals: eoi.id } }, { state: { equals: "sent" } }],
			},
			data: {
				state: "expired",
				...(mwajiriId && mjakaziId
					? { pendingKey: `${mwajiriId}:${mjakaziId}:${eoi.id}` }
					: {}),
			},
			overrideAccess: true,
		});
		return result.docs.length > 0;
	} catch (error) {
		console.error("[services/eoi] expiry CAS failed:", error);
		return false;
	}
};

// polled daily by the eoi-expire job. finds unanswered (sent) interests older
// than the policy's expiry window and expires each idempotently. expiry resolves
// the interest for the open-pool gate and frees the pair key, so a missed window
// self-corrects on the next run
const expireUnansweredEois = async (payload: Payload): Promise<{ expired: number }> => {
	const policy = await getEoiPolicy(payload);
	const expiryMs = policy.expiryDays * 24 * 60 * 60 * 1000;
	const now = Date.now();

	let candidates: ExpressionsOfInterest[];
	try {
		const result = await payload.find({
			collection: "expressions-of-interest",
			where: { state: { equals: "sent" } },
			limit: 200,
			depth: 0,
			overrideAccess: true,
		});
		candidates = result.docs;
	} catch (error) {
		console.error("[services/eoi] expiry lookup failed:", error);
		return { expired: 0 };
	}

	let expired = 0;

	for (const eoi of candidates) {
		if (!eoi.sentAt) continue;

		const elapsed = now - new Date(eoi.sentAt).getTime();
		if (elapsed < expiryMs) continue;

		const applied = await expireEoi(payload, eoi);
		if (!applied) continue;

		const mwajiriId = toId(eoi.mwajiri);
		const mjakaziId = toId(eoi.mjakazi);

		await writeAuditLog({
			action: "eoi_expired",
			targetId: mwajiriId,
			targetLabel: mwajiriId ? await loadUserName(payload, mwajiriId) : null,
			previousState: "sent",
			newState: "expired",
			metadata: { eoiId: eoi.id, mjakaziProfileId: mjakaziId },
			source: "system",
		});

		expired += 1;
	}

	return { expired };
};

export {
	expireUnansweredEois,
	getEoiSendEligibility,
	getProfileInterestStatus,
	listReceivedEois,
	listSentEois,
	listUnavailableForInterest,
	respondToEoi,
	sendAcceptedEoiNudges,
	sendEoiBatch,
};
export type { OpenPool, ProfileInterestStatus, SendEligibility };
