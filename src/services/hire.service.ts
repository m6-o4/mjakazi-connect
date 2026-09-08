import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import {
	sendHireAgreedEmail,
	sendHireConfirmedEmail,
	sendHireEndedEmail,
	sendHireReversedEmail,
} from "@/lib/email";
import {
	loadProfileDisplay,
	loadSenderInfo,
	loadUserName,
	toId,
	userLabel,
} from "@/lib/payload-helpers";
import { loadUserEmail } from "@/lib/user-email";
import type { Hire, User } from "@/payload-types";
import { getOwnProfile } from "@/services/profile.service";
import {
	getOwnSubscription,
	getSubscriptionByUser,
} from "@/services/subscription.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type HireState = NonNullable<Hire["state"]>;
type HireConfirmer = NonNullable<Hire["confirmedBy"]>;

type MwajiriHireCandidate = {
	mjakaziId: string;
	displayName: string;
	location: string | null;
	sourceEoiId: string | null;
};

type MjakaziHireCandidate = {
	mwajiriId: string;
	name: string;
	location: string | null;
};

// listHires (mjakazi) only returns active hires, so its state is narrowed to the
// two live states rather than carrying the unreachable `reversed` case into the UI
type HireListItemState = Extract<HireState, "pending_agreement" | "agreed">;

type HireListItem = {
	id: string;
	counterpartyId: string;
	counterpartyName: string;
	state: HireListItemState;
	awaitingYou: boolean;
};

// the mwajiri overview also needs completed (`ended`) hires so they can be
// reviewed, so its list carries the extra terminal state
type MwajiriHireState = Extract<HireState, "pending_agreement" | "agreed" | "ended">;

type MwajiriHireItem = {
	id: string;
	mjakaziId: string;
	counterpartyName: string;
	state: MwajiriHireState;
	awaitingYou: boolean;
};

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

// trusted read of a mjakazi profile's owner + display name. the hire service
// writes availability on the profile's behalf, which needs the trusted path —
// the write is authorized by the caller's role checks, not by profile field
// access. an explicit select keeps contact and identity fields out of this read
const loadProfile = async (
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

const findHire = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
): Promise<Hire | null> => {
	try {
		const result = await payload.find({
			collection: "hires",
			where: {
				and: [{ mwajiri: { equals: mwajiriId } }, { mjakazi: { equals: mjakaziId } }],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		return result.docs[0] ?? null;
	} catch {
		return null;
	}
};

const findAcceptedEoi = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
): Promise<string | null> => {
	try {
		const result = await payload.find({
			collection: "expressions-of-interest",
			where: {
				and: [
					{ mwajiri: { equals: mwajiriId } },
					{ mjakazi: { equals: mjakaziId } },
					{ state: { equals: "accepted" } },
				],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		return result.docs[0] ? String(result.docs[0].id) : null;
	} catch {
		return null;
	}
};

// whether the mwajiri has an accepted interest or an unlocked contact with a
// given wajakazi — the only wajakazi they are allowed to confirm a hire against
const isHireCandidateForMwajiri = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
): Promise<boolean> => {
	const [eoi, unlock] = await Promise.all([
		payload.find({
			collection: "expressions-of-interest",
			where: {
				and: [
					{ mwajiri: { equals: mwajiriId } },
					{ mjakazi: { equals: mjakaziId } },
					{ state: { equals: "accepted" } },
				],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		}),
		payload.find({
			collection: "contact-unlocks",
			where: {
				and: [{ mwajiri: { equals: mwajiriId } }, { mjakazi: { equals: mjakaziId } }],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		}),
	]);
	return eoi.docs.length > 0 || unlock.docs.length > 0;
};

// whether a mwajiri unlocked the mjakazi's contact or sent them an interest —
// the only mwajiri a mjakazi may attribute a hire to
const isHireCandidateForMjakazi = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
): Promise<boolean> => {
	const [unlock, eoi] = await Promise.all([
		payload.find({
			collection: "contact-unlocks",
			where: {
				and: [{ mwajiri: { equals: mwajiriId } }, { mjakazi: { equals: mjakaziId } }],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		}),
		payload.find({
			collection: "expressions-of-interest",
			where: {
				and: [{ mwajiri: { equals: mwajiriId } }, { mjakazi: { equals: mjakaziId } }],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		}),
	]);
	return unlock.docs.length > 0 || eoi.docs.length > 0;
};

// fire-and-forget: notifies the counterpart that a hire was recorded involving
// them, and how to reverse it. the transition is already committed by now
const notifyHireConfirmed = async (
	payload: Payload,
	counterpartUserId: string | null,
	actorName: string,
	actorRole: HireConfirmer,
): Promise<void> => {
	if (!counterpartUserId) return;
	try {
		const recipient = await loadUserEmail(payload, counterpartUserId);
		if (!recipient) return;
		await sendHireConfirmedEmail({
			payload,
			to: recipient.email,
			firstName: recipient.firstName,
			otherPartyName: actorName,
			otherPartyRole: actorRole,
		});
	} catch (error) {
		console.error("[services/hire] confirmed notification email failed:", error);
	}
};

// fire-and-forget: sent to both parties once the second side agrees
const notifyHireAgreed = async (
	payload: Payload,
	mwajiriUserId: string,
	mjakaziUserId: string | null,
	mwajiriName: string,
	mjakaziName: string,
): Promise<void> => {
	try {
		const mwajiri = await loadUserEmail(payload, mwajiriUserId);
		if (mwajiri) {
			await sendHireAgreedEmail({
				payload,
				to: mwajiri.email,
				firstName: mwajiri.firstName,
				otherPartyName: mjakaziName,
			});
		}
	} catch (error) {
		console.error("[services/hire] agreed mwajiri email failed:", error);
	}

	if (!mjakaziUserId) return;
	try {
		const mjakazi = await loadUserEmail(payload, mjakaziUserId);
		if (mjakazi) {
			await sendHireAgreedEmail({
				payload,
				to: mjakazi.email,
				firstName: mjakazi.firstName,
				otherPartyName: mwajiriName,
			});
		}
	} catch (error) {
		console.error("[services/hire] agreed mjakazi email failed:", error);
	}
};

// fire-and-forget: notifies the counterpart that a hire was reversed
const notifyHireReversed = async (
	payload: Payload,
	counterpartUserId: string | null,
	actorName: string,
): Promise<void> => {
	if (!counterpartUserId) return;
	try {
		const recipient = await loadUserEmail(payload, counterpartUserId);
		if (!recipient) return;
		await sendHireReversedEmail({
			payload,
			to: recipient.email,
			firstName: recipient.firstName,
			otherPartyName: actorName,
		});
	} catch (error) {
		console.error("[services/hire] reversed notification email failed:", error);
	}
};

// fire-and-forget: notifies the counterpart that a completed contract was ended
const notifyHireEnded = async (
	payload: Payload,
	counterpartUserId: string | null,
	actorName: string,
): Promise<void> => {
	if (!counterpartUserId) return;
	try {
		const recipient = await loadUserEmail(payload, counterpartUserId);
		if (!recipient) return;
		await sendHireEndedEmail({
			payload,
			to: recipient.email,
			firstName: recipient.firstName,
			otherPartyName: actorName,
		});
	} catch (error) {
		console.error("[services/hire] ended notification email failed:", error);
	}
};

// the single write path. `confirmedBy` is derived from the actor's role, so a
// first confirmation creates a pending hire, the counterpart re-confirming flips
// it to agreed, and a reversed hire re-opens as pending. sets availability →
// hired on every confirmation so the profile leaves the directory immediately
const confirmHireCore = async (
	payload: Payload,
	actor: User,
	mwajiriId: string,
	mjakaziId: string,
	sourceEoiId: string | null,
): Promise<Result<Hire>> => {
	if (actor.role !== "mwajiri" && actor.role !== "mjakazi") {
		return fail("Forbidden", "forbidden");
	}
	const actorRole = actor.role;

	const profile = await loadProfile(payload, mjakaziId);
	if (!profile) return fail("Profile not found.", "not_found");
	const mjakaziOwnerId = toId(profile.user);
	const counterpartUserId = actorRole === "mwajiri" ? mjakaziOwnerId : mwajiriId;
	const actorName = userLabel(actor);
	const mwajiriName =
		actorRole === "mwajiri"
			? actorName
			: ((await loadUserName(payload, mwajiriId)) ?? "the employer");
	const mjakaziName = profile.displayName ?? "the wajakazi";

	const existing = await findHire(payload, mwajiriId, mjakaziId);

	if (existing?.state === "agreed") {
		return { success: true, data: existing };
	}

	if (existing?.state === "pending_agreement") {
		if (existing.confirmedBy === actorRole) {
			return { success: true, data: existing };
		}

		// the counterpart agrees
		try {
			const result = await payload.update({
				collection: "hires",
				where: {
					and: [
						{ id: { equals: existing.id } },
						{ state: { equals: "pending_agreement" } },
					],
				},
				data: { state: "agreed", agreedAt: new Date().toISOString() },
				overrideAccess: true,
			});

			if (result.docs.length === 0) {
				return fail("Hire changed. Please refresh and try again.", "conflict");
			}

			await writeAuditLog({
				action: "hire_agreed",
				actorId: actor.id,
				actorLabel: actorName,
				targetId: counterpartUserId,
				previousState: "pending_agreement",
				newState: "agreed",
				metadata: { mjakaziProfileId: mjakaziId },
				source: "user",
			});

			await notifyHireAgreed(
				payload,
				mwajiriId,
				mjakaziOwnerId,
				mwajiriName,
				mjakaziName,
			);

			return { success: true, data: result.docs[0] };
		} catch (error) {
			console.error("[services/hire] agree failed:", error);
			return fail("Could not confirm the hire.");
		}
	}

	// no existing hire, or a previously reversed one — create/reopen as pending
	const subscription = await getSubscriptionByUser(payload, mwajiriId);
	const now = new Date().toISOString();

	try {
		await payload.update({
			collection: "wajakazi-profiles",
			id: mjakaziId,
			data: { availabilityStatus: "hired" },
			overrideAccess: true,
		});

		let hire: Hire;

		if (existing?.state === "reversed") {
			const result = await payload.update({
				collection: "hires",
				where: {
					and: [{ id: { equals: existing.id } }, { state: { equals: "reversed" } }],
				},
				data: {
					confirmedBy: actorRole,
					confirmedAt: now,
					agreedAt: null,
					reversedAt: null,
					state: "pending_agreement",
					sourceEoi: sourceEoiId,
					subscription: subscription?.id ?? null,
				},
				overrideAccess: true,
			});
			if (result.docs.length === 0) {
				return fail("Hire changed. Please refresh and try again.", "conflict");
			}
			hire = result.docs[0];
		} else {
			try {
				hire = await payload.create({
					collection: "hires",
					data: {
						mwajiri: mwajiriId,
						mjakazi: mjakaziId,
						subscription: subscription?.id ?? null,
						confirmedBy: actorRole,
						confirmedAt: now,
						state: "pending_agreement",
						sourceEoi: sourceEoiId,
					},
					overrideAccess: true,
				});
			} catch (error) {
				// a concurrent opposite-party confirmation created this hire first —
				// the unique (mwajiri, mjakazi) index rejects the create. re-read and
				// converge (the counterpart's pending hire flips to agreed) rather
				// than surfacing a spurious failure
				const raced = await findHire(payload, mwajiriId, mjakaziId);
				if (raced) {
					return confirmHireCore(payload, actor, mwajiriId, mjakaziId, sourceEoiId);
				}
				throw error;
			}
		}

		await writeAuditLog({
			action: "hire_confirmed",
			actorId: actor.id,
			actorLabel: actorName,
			targetId: counterpartUserId,
			previousState: existing?.state ?? null,
			newState: "pending_agreement",
			metadata: {
				mjakaziProfileId: mjakaziId,
				sourceEoiId: sourceEoiId ?? null,
				subscriptionId: subscription?.id ?? null,
			},
			source: "user",
		});

		await notifyHireConfirmed(payload, counterpartUserId, actorName, actorRole);

		return { success: true, data: hire };
	} catch (error) {
		console.error("[services/hire] confirm failed:", error);
		return fail("Could not confirm the hire.");
	}
};

// the shared reversal: compare-and-swap an active hire to reversed, write the
// audit entry, and notify the counterpart. `actor` is null for the system path
// (a mjakazi un-hiring themselves via the availability toggle)
const reverseHireRecord = async (
	payload: Payload,
	hire: Hire,
	actor: User | null,
): Promise<Result<Hire>> => {
	const mjakaziId = toId(hire.mjakazi);
	const mwajiriId = toId(hire.mwajiri);
	if (!mjakaziId || !mwajiriId) return fail("Hire is missing a party.", "invalid");

	const profile = await loadProfile(payload, mjakaziId);
	const mjakaziOwnerId = profile ? toId(profile.user) : null;
	const counterpartUserId = actor?.role === "mwajiri" ? mjakaziOwnerId : mwajiriId;
	const actorName = actor ? userLabel(actor) : "the wajakazi";

	try {
		const result = await payload.update({
			collection: "hires",
			where: {
				and: [
					{ id: { equals: hire.id } },
					{ state: { in: ["pending_agreement", "agreed"] } },
				],
			},
			data: { state: "reversed", reversedAt: new Date().toISOString() },
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			return fail("Hire changed. Please refresh and try again.", "conflict");
		}

		// a reversed hire means the placement did not hold — free the mjakazi back
		// to available so they are not left hidden with no active hire. the system
		// path (actor null) is triggered by the availability toggle itself, which
		// has already changed availability, so it skips this
		if (actor) {
			await payload.update({
				collection: "wajakazi-profiles",
				id: mjakaziId,
				data: { availabilityStatus: "available" },
				overrideAccess: true,
			});
		}

		await writeAuditLog({
			action: "hire_reversed",
			actorId: actor?.id ?? null,
			actorLabel: actor ? actorName : null,
			targetId: counterpartUserId,
			previousState: hire.state,
			newState: "reversed",
			metadata: { mjakaziProfileId: mjakaziId },
			source: actor ? "user" : "system",
		});

		await notifyHireReversed(payload, counterpartUserId, actorName);

		return { success: true, data: result.docs[0] };
	} catch (error) {
		console.error("[services/hire] reverse failed:", error);
		return fail("Could not reverse the hire.");
	}
};

// mwajiri side — the candidates they can mark as hired: wajakazi whose interest
// they accepted, or whose contact they unlocked, minus any active hire
const listHireCandidatesForMwajiri = async (
	payload: Payload,
	user: User,
): Promise<MwajiriHireCandidate[]> => {
	if (user.role !== "mwajiri") return [];

	const [eoiResult, unlockResult] = await Promise.all([
		payload.find({
			collection: "expressions-of-interest",
			where: {
				and: [{ mwajiri: { equals: user.id } }, { state: { equals: "accepted" } }],
			},
			limit: 100,
			depth: 0,
			select: { mjakazi: true },
			overrideAccess: true,
		}),
		payload.find({
			collection: "contact-unlocks",
			where: { mwajiri: { equals: user.id } },
			limit: 200,
			depth: 0,
			select: { mjakazi: true },
			overrideAccess: true,
		}),
	]);

	const eoiByProfile = new Map<string, string>();
	const profileIds = new Set<string>();
	for (const doc of eoiResult.docs) {
		const pid = toId(doc.mjakazi);
		if (pid) {
			eoiByProfile.set(pid, doc.id);
			profileIds.add(pid);
		}
	}
	for (const doc of unlockResult.docs) {
		const pid = toId(doc.mjakazi);
		if (pid) profileIds.add(pid);
	}

	if (profileIds.size === 0) return [];

	const activeHires = await payload.find({
		collection: "hires",
		where: {
			and: [
				{ mwajiri: { equals: user.id } },
				{ state: { in: ["pending_agreement", "agreed"] } },
			],
		},
		limit: 100,
		depth: 0,
		select: { mjakazi: true },
		overrideAccess: true,
	});
	const activeProfileIds = new Set(
		activeHires.docs
			.map((doc) => toId(doc.mjakazi))
			.filter((id): id is string => id !== null),
	);

	const ids = [...profileIds].filter((id) => !activeProfileIds.has(id));
	const display = await loadProfileDisplay(payload, ids);

	return ids.map((id) => ({
		mjakaziId: id,
		displayName: display.get(id)?.displayName ?? "Wajakazi",
		location: display.get(id)?.location ?? null,
		sourceEoiId: eoiByProfile.get(id) ?? null,
	}));
};

// mjakazi side — the waajiri they may attribute a hire to: those who unlocked
// their contact or sent an expression of interest, minus any active hire
const listHireCandidatesForMjakazi = async (
	payload: Payload,
	user: User,
	profileId?: string,
): Promise<MjakaziHireCandidate[]> => {
	if (user.role !== "mjakazi") return [];

	const resolvedId = profileId ?? (await getOwnProfile(payload, user))?.id;
	if (!resolvedId) return [];

	const [unlockResult, eoiResult] = await Promise.all([
		payload.find({
			collection: "contact-unlocks",
			where: { mjakazi: { equals: resolvedId } },
			limit: 200,
			depth: 0,
			select: { mwajiri: true },
			overrideAccess: true,
		}),
		payload.find({
			collection: "expressions-of-interest",
			where: { mjakazi: { equals: resolvedId } },
			limit: 200,
			depth: 0,
			select: { mwajiri: true },
			overrideAccess: true,
		}),
	]);

	const userIds = new Set<string>();
	for (const doc of unlockResult.docs) {
		const uid = toId(doc.mwajiri);
		if (uid) userIds.add(uid);
	}
	for (const doc of eoiResult.docs) {
		const uid = toId(doc.mwajiri);
		if (uid) userIds.add(uid);
	}

	if (userIds.size === 0) return [];

	const activeHires = await payload.find({
		collection: "hires",
		where: {
			and: [
				{ mjakazi: { equals: resolvedId } },
				{ state: { in: ["pending_agreement", "agreed"] } },
			],
		},
		limit: 100,
		depth: 0,
		select: { mwajiri: true },
		overrideAccess: true,
	});
	const activeUserIds = new Set(
		activeHires.docs
			.map((doc) => toId(doc.mwajiri))
			.filter((id): id is string => id !== null),
	);

	const ids = [...userIds].filter((id) => !activeUserIds.has(id));
	const senders = await loadSenderInfo(payload, ids);

	return ids.map((id) => ({
		mwajiriId: id,
		name: senders.get(id)?.name ?? "An employer",
		location: senders.get(id)?.location ?? null,
	}));
};

// mwajiri side — every hire is in view, active or completed, so the overview can
// offer "end contract" on agreed hires and "leave a review" on ended ones.
// `awaitingYou` is true when the mjakazi confirmed first and the mwajiri has not
// yet agreed
const listHiresForMwajiri = async (
	payload: Payload,
	user: User,
): Promise<MwajiriHireItem[]> => {
	if (user.role !== "mwajiri") return [];

	const result = await payload.find({
		collection: "hires",
		where: {
			and: [
				{ mwajiri: { equals: user.id } },
				{ state: { in: ["pending_agreement", "agreed", "ended"] } },
			],
		},
		limit: 100,
		depth: 0,
		sort: "-confirmedAt",
		select: { mjakazi: true, state: true, confirmedBy: true },
		overrideAccess: true,
	});

	const profileIds = result.docs
		.map((doc) => toId(doc.mjakazi))
		.filter((id): id is string => id !== null);
	const display = await loadProfileDisplay(payload, profileIds);

	return result.docs.map((doc) => {
		const pid = toId(doc.mjakazi) ?? "";
		return {
			id: doc.id,
			mjakaziId: pid,
			counterpartyName: display.get(pid)?.displayName ?? "Wajakazi",
			state:
				doc.state === "agreed"
					? "agreed"
					: doc.state === "ended"
						? "ended"
						: "pending_agreement",
			awaitingYou: doc.state === "pending_agreement" && doc.confirmedBy === "mjakazi",
		};
	});
};

// the mjakazi's active hires, shaped for the opportunities inbox. `awaitingYou`
// is true when the mwajiri confirmed first and this party has not yet agreed
const listHires = async (
	payload: Payload,
	user: User,
	profileId?: string,
): Promise<HireListItem[]> => {
	if (user.role === "mjakazi") {
		const resolvedId = profileId ?? (await getOwnProfile(payload, user))?.id;
		if (!resolvedId) return [];

		const result = await payload.find({
			collection: "hires",
			where: {
				and: [
					{ mjakazi: { equals: resolvedId } },
					{ state: { in: ["pending_agreement", "agreed"] } },
				],
			},
			limit: 100,
			depth: 0,
			sort: "-confirmedAt",
			select: { mwajiri: true, state: true, confirmedBy: true },
			overrideAccess: true,
		});

		const userIds = result.docs
			.map((doc) => toId(doc.mwajiri))
			.filter((id): id is string => id !== null);
		const senders = await loadSenderInfo(payload, userIds);

		return result.docs.map((doc) => {
			const uid = toId(doc.mwajiri) ?? "";
			return {
				id: doc.id,
				counterpartyId: uid,
				counterpartyName: senders.get(uid)?.name ?? "An employer",
				state: doc.state === "agreed" ? "agreed" : "pending_agreement",
				awaitingYou: doc.state === "pending_agreement" && doc.confirmedBy === "mwajiri",
			};
		});
	}

	return [];
};

// mwajiri side — marks a hire with a wajakazi, or agrees to one the wajakazi
// already confirmed. gated on an active subscription and a prior relationship
// (accepted interest or unlocked contact) with the wajakazi. `sourceEoiId` is
// the accepted interest that led here, when there was one
const confirmHire = async (
	payload: Payload,
	actor: User,
	mjakaziId: string,
	sourceEoiId?: string | null,
): Promise<Result<Hire>> => {
	if (actor.role !== "mwajiri") return fail("Forbidden", "forbidden");

	const subscription = await getOwnSubscription(payload, actor);
	if (!subscription || subscription.subscriptionState !== "active") {
		return fail(
			"An active subscription is required to confirm a hire.",
			"subscription_required",
		);
	}

	if (!(await isHireCandidateForMwajiri(payload, actor.id, mjakaziId))) {
		return fail("This wajakazi is not in your hire list.", "not_found");
	}

	return confirmHireCore(payload, actor, actor.id, mjakaziId, sourceEoiId ?? null);
};

// mjakazi side — confirms a hire with a mwajiri chosen from the "who hired you"
// picker. gated on a prior relationship (unlocked contact or sent interest) with
// that mwajiri, and attributing to the accepted interest when one exists
const confirmHireByMjakazi = async (
	payload: Payload,
	actor: User,
	mwajiriId: string,
): Promise<Result<Hire>> => {
	if (actor.role !== "mjakazi") return fail("Forbidden", "forbidden");

	const profile = await getOwnProfile(payload, actor);
	if (!profile) return fail("Profile not found.", "not_found");

	if (!(await isHireCandidateForMjakazi(payload, mwajiriId, profile.id))) {
		return fail("This mwajiri is not in your hire list.", "not_found");
	}

	const sourceEoiId = await findAcceptedEoi(payload, mwajiriId, profile.id);

	return confirmHireCore(payload, actor, mwajiriId, profile.id, sourceEoiId);
};

// either party reverses an active hire they are part of. the record is marked
// reversed, the mjakazi is freed back to available, and the counterpart is
// notified
const reverseHire = async (
	payload: Payload,
	actor: User,
	hireId: string,
): Promise<Result<Hire>> => {
	if (actor.role !== "mwajiri" && actor.role !== "mjakazi") {
		return fail("Forbidden", "forbidden");
	}

	let hire: Hire;
	try {
		hire = await payload.findByID({
			collection: "hires",
			id: hireId,
			depth: 0,
			overrideAccess: true,
		});
	} catch {
		return fail("Hire not found.", "not_found");
	}

	const mwajiriId = toId(hire.mwajiri);
	const mjakaziId = toId(hire.mjakazi);
	if (!mjakaziId || !mwajiriId) return fail("Hire is missing a party.", "invalid");

	const profile = await loadProfile(payload, mjakaziId);
	const mjakaziOwnerId = profile ? toId(profile.user) : null;

	const isParty =
		(actor.role === "mwajiri" && mwajiriId === actor.id) ||
		(actor.role === "mjakazi" && mjakaziOwnerId === actor.id);
	if (!isParty) return fail("Forbidden", "forbidden");

	if (hire.state === "reversed") return { success: true, data: hire };

	return reverseHireRecord(payload, hire, actor);
};

// system path — reverses every active hire for a mjakazi profile, used when they
// move their availability off `hired` so no stale match lingers on the record
const reverseHiresForMjakazi = async (
	payload: Payload,
	actor: User,
	mjakaziProfileId: string,
): Promise<{ reversed: number }> => {
	const result = await payload.find({
		collection: "hires",
		where: {
			and: [
				{ mjakazi: { equals: mjakaziProfileId } },
				{ state: { in: ["pending_agreement", "agreed"] } },
			],
		},
		limit: 100,
		depth: 0,
		overrideAccess: true,
	});

	let reversed = 0;
	for (const hire of result.docs) {
		const outcome = await reverseHireRecord(payload, hire, actor);
		if (outcome.success) reversed += 1;
	}

	return { reversed };
};

// either party ends a completed contract. agreed → ended (the natural close,
// distinct from `reversed` which means "did not hold"), the mjakazi is released
// back to available, and the audit records the close — for a mwajiri, a review
// can follow
const endHire = async (
	payload: Payload,
	actor: User,
	hireId: string,
): Promise<Result<Hire>> => {
	if (actor.role !== "mwajiri" && actor.role !== "mjakazi") {
		return fail("Forbidden", "forbidden");
	}

	let hire: Hire;
	try {
		hire = await payload.findByID({
			collection: "hires",
			id: hireId,
			depth: 0,
			overrideAccess: true,
		});
	} catch {
		return fail("Hire not found.", "not_found");
	}

	const mwajiriId = toId(hire.mwajiri);
	const mjakaziId = toId(hire.mjakazi);
	if (!mjakaziId || !mwajiriId) return fail("Hire is missing a party.", "invalid");
	if (hire.state !== "agreed") return fail("This hire is not active.", "invalid");

	const profile = await loadProfile(payload, mjakaziId);
	const mjakaziOwnerId = profile ? toId(profile.user) : null;

	const isParty =
		(actor.role === "mwajiri" && mwajiriId === actor.id) ||
		(actor.role === "mjakazi" && mjakaziOwnerId === actor.id);
	if (!isParty) return fail("Forbidden", "forbidden");

	try {
		const result = await payload.update({
			collection: "hires",
			where: {
				and: [{ id: { equals: hire.id } }, { state: { equals: "agreed" } }],
			},
			data: { state: "ended", endedAt: new Date().toISOString() },
			overrideAccess: true,
		});
		if (result.docs.length === 0) {
			return fail("Hire changed. Please refresh and try again.", "conflict");
		}

		// release the mjakazi back to available so they re-enter the directory
		await payload.update({
			collection: "wajakazi-profiles",
			id: mjakaziId,
			data: { availabilityStatus: "available" },
			overrideAccess: true,
		});

		await writeAuditLog({
			action: "hire_ended",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: actor.role === "mwajiri" ? mjakaziOwnerId : mwajiriId,
			previousState: "agreed",
			newState: "ended",
			metadata: { mjakaziProfileId: mjakaziId },
			source: "user",
		});

		await notifyHireEnded(
			payload,
			actor.role === "mwajiri" ? mjakaziOwnerId : mwajiriId,
			userLabel(actor),
		);

		return { success: true, data: result.docs[0] };
	} catch (error) {
		console.error("[services/hire] end failed:", error);
		return fail("Could not end the contract.");
	}
};

export {
	confirmHire,
	confirmHireByMjakazi,
	endHire,
	listHireCandidatesForMjakazi,
	listHireCandidatesForMwajiri,
	listHires,
	listHiresForMwajiri,
	reverseHire,
	reverseHiresForMjakazi,
};
