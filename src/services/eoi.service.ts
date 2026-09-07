import { randomUUID } from "crypto";
import { ValidationError, type Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import {
	sendEoiBatchSentEmail,
	sendEoiReceivedEmail,
	sendEoiRespondedEmail,
	sendEoiResponseConfirmedEmail,
} from "@/lib/email";
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

// relationships come back as an id string at depth 0, or as an object when
// populated. normalized to an id here
const toId = (
	value: string | { id?: string | number } | null | undefined,
): string | null => {
	if (!value) return null;
	if (typeof value === "string") return value;
	return typeof value.id === "number" ? String(value.id) : (value.id ?? null);
};

// the actor label is a name snapshot so the log stays readable after an account
// is renamed or deleted
const userLabel = (user: User): string => {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return name || user.email;
};

// the unique `pendingKey` index makes a concurrent duplicate send fail with a
// validation error rather than a second outstanding record for the same pair
const isDuplicatePendingKeyError = (error: unknown): boolean =>
	error instanceof ValidationError &&
	Boolean(error.data?.errors?.some((fieldError) => fieldError.path === "pendingKey"));

// trusted read of a user's full name, used to label a sender in the inbox and
// emails. no contact field is returned
const loadUserName = async (payload: Payload, userId: string): Promise<string | null> => {
	try {
		const user = await payload.findByID({
			collection: "users",
			id: userId,
			depth: 0,
			overrideAccess: true,
		});
		const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
		return name || null;
	} catch {
		return null;
	}
};

// resolves the display name + location for a set of wajakazi profile ids. an
// explicit select — no contact or identity fields are ever read here
const loadProfileDisplay = async (
	payload: Payload,
	ids: string[],
): Promise<Map<string, { displayName: string | null; location: string | null }>> => {
	const map = new Map<string, { displayName: string | null; location: string | null }>();
	if (ids.length === 0) return map;

	const result = await payload.find({
		collection: "wajakazi-profiles",
		where: { id: { in: ids } },
		limit: ids.length,
		depth: 0,
		select: { displayName: true, location: true },
		overrideAccess: true,
	});

	for (const profile of result.docs) {
		map.set(String(profile.id), {
			displayName: profile.displayName ?? null,
			location: profile.location ?? null,
		});
	}

	return map;
};

// resolves the sender name + location for a set of mwajiri user ids. the name
// comes from the user record; the location from their waajiri profile
const loadSenderInfo = async (
	payload: Payload,
	userIds: string[],
): Promise<Map<string, { name: string; location: string | null }>> => {
	const map = new Map<string, { name: string; location: string | null }>();
	if (userIds.length === 0) return map;

	const users = await payload.find({
		collection: "users",
		where: { id: { in: userIds } },
		limit: userIds.length,
		depth: 0,
		select: { firstName: true, lastName: true },
		overrideAccess: true,
	});

	for (const user of users.docs) {
		const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
		map.set(String(user.id), { name, location: null });
	}

	const profiles = await payload.find({
		collection: "waajiri-profiles",
		where: { user: { in: userIds } },
		limit: userIds.length,
		depth: 0,
		select: { user: true, location: true },
		overrideAccess: true,
	});

	for (const profile of profiles.docs) {
		const userId = toId(profile.user);
		if (!userId) continue;
		const entry = map.get(userId);
		if (entry) entry.location = profile.location ?? null;
	}

	return map;
};

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

export { listReceivedEois, listSentEois, respondToEoi, sendEoiBatch };
