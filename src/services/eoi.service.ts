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
import { loadProfileDisplay, loadSenderInfo, loadUserName, toId, userLabel } from "@/lib/payload-helpers";
import { loadUserEmail } from "@/lib/user-email";
import { DIRECTORY_VISIBLE } from "@/payload/access/access-control";
import type { ExpressionsOfInterest, User, WajakaziProfile } from "@/payload-types";
import { getOwnProfile } from "@/services/profile.service";
import { getOwnSubscription } from "@/services/subscription.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type EoiState = NonNullable<ExpressionsOfInterest["state"]>;
type EoiResponse = Extract<EoiState, "accepted" | "rejected">;

// a batch is 3–5 wajakazi — the product's anti-firehose bound, enforced here and
// re-checked in the server action
const MIN_BATCH = 3;
const MAX_BATCH = 5;

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

// the unique `pendingKey` index makes a concurrent duplicate send fail with a
// validation error rather than a second outstanding record for the same pair
const isDuplicatePendingKeyError = (error: unknown): boolean =>
	error instanceof ValidationError &&
	Boolean(error.data?.errors?.some((fieldError) => fieldError.path === "pendingKey"));

// sends a batch of expressions of interest. the mwajiri must hold an active
// subscription; every recipient must still be directory-visible; and no
// outstanding (sent/accepted) interest may already exist for a recipient. the
// batch is created atomically enough — each eoi is its own record — and one audit
// entry + one email fire per recipient.
const sendEoiBatch = async (
	payload: Payload,
	actor: User,
	mjakaziIds: string[],
): Promise<Result<{ batchId: string; sent: number }>> => {
	if (actor.role !== "mwajiri") return fail("Forbidden", "forbidden");

	const ids = [...new Set(mjakaziIds)];
	if (ids.length < MIN_BATCH || ids.length > MAX_BATCH) {
		return fail(
			`Select between ${MIN_BATCH} and ${MAX_BATCH} wajakazi.`,
			"invalid_batch_size",
		);
	}

	const subscription = await getOwnSubscription(payload, actor);
	if (!subscription || subscription.subscriptionState !== "active") {
		return fail("An active subscription is required to send interest.", "subscription_required");
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
		return fail(
			"One or more wajakazi are no longer available.",
			"not_found",
		);
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
			mjakaziName: display.get(profileId)?.displayName ?? "Wajakazi",
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

	try {
		const result = await payload.update({
			collection: "expressions-of-interest",
			where: {
				and: [{ id: { equals: eoi.id } }, { state: { equals: "sent" } }],
			},
			data: {
				state: response,
				respondedAt: new Date().toISOString(),
				// a rejection frees the pair key so the mwajiri may send interest
				// again later; an acceptance keeps it, blocking a re-send
				...(response === "rejected"
					? { pendingKey: `${mwajiriId ?? "unknown"}:${profile.id}:${eoi.id}` }
					: {}),
			},
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			return fail("Interest changed. Please refresh and try again.", "conflict");
		}

		const mwajiriName = mwajiriId ? (await loadUserName(payload, mwajiriId)) : null;

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

// the 7- and 14-day windows after an accepted interest, one nudge each. the
// array index is the number of nudges already sent, so `NUDGE_WINDOWS_MS[0]` is
// the first nudge (7 days) and `[1]` the second (14 days)
const NUDGE_WINDOWS_MS = [7, 14].map((days) => days * 24 * 60 * 60 * 1000);

// trusted read of a mjakazi profile's owner + display name for the nudge email.
// an explicit select keeps contact and identity fields out of this read
const loadMjakaziOwner = async (
	payload: Payload,
	profileId: string,
): Promise<{ user?: string | { id?: string | number } | null; displayName?: string | null } | null> => {
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
				and: [
					{ id: { equals: eoi.id } },
					{ state: { equals: "accepted" } },
					countClause,
				],
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
	const mjakaziName = profile?.displayName ?? "the wajakazi";
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
const sendAcceptedEoiNudges = async (
	payload: Payload,
): Promise<{ nudged: number }> => {
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

export { listReceivedEois, listSentEois, respondToEoi, sendAcceptedEoiNudges, sendEoiBatch };
