import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import { userLabel } from "@/lib/payload-helpers";
import type { User, WajakaziProfile } from "@/payload-types";
import {
	getSubscriptionByUser,
	reinstateSubscription,
	suspendSubscription,
} from "@/services/subscription.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type AccountState = NonNullable<User["accountState"]>;

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

const isBackOffice = (user: User): boolean =>
	user.role === "admin" || user.role === "staff";

const isAdmin = (user: User): boolean => user.role === "admin";

const isSaasAccount = (user: User): boolean =>
	user.role === "mjakazi" || user.role === "mwajiri";

// trusted read of the account being moderated. the moderation service is a
// trusted writer and the actor role is checked in the caller, so this bypasses
// access control to see accountState and role even for an account a staff member
// could not otherwise edit
const loadTargetUser = async (payload: Payload, userId: string): Promise<User | null> => {
	try {
		return await payload.findByID({
			collection: "users",
			id: userId,
			depth: 0,
			overrideAccess: true,
		});
	} catch {
		return null;
	}
};

// resolves the wajakazi profile id for a user. profiles are 1:1 with users, so
// this returns at most one record
const loadProfileByUserId = async (
	payload: Payload,
	userId: string,
): Promise<WajakaziProfile | null> => {
	try {
		const result = await payload.find({
			collection: "wajakazi-profiles",
			where: { user: { equals: userId } },
			limit: 1,
			overrideAccess: true,
		});
		return result.docs[0] ?? null;
	} catch {
		return null;
	}
};

// compare-and-swap on users.accountState. the write only lands if the state is
// still exactly what we observed, so a concurrent moderation action loses
const applyAccountState = async (
	payload: Payload,
	userId: string,
	from: AccountState,
	data: Pick<User, "accountState" | "suspendedAt" | "suspensionReason">,
): Promise<Result<User>> => {
	try {
		const result = await payload.update({
			collection: "users",
			where: {
				and: [{ id: { equals: userId } }, { accountState: { equals: from } }],
			},
			data,
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			return fail("Account state changed. Please refresh and try again.", "conflict");
		}

		return { success: true, data: result.docs[0] };
	} catch (error) {
		console.error("[services/moderation] accountState update failed:", error);
		return fail("Could not update the account state.");
	}
};

// sets (or clears) the suspended flag on the wajakazi profile, which is what the
// directory guard reads to hide a suspended worker. best-effort — the account
// lock is already committed, and a failure here is logged rather than rolled back
const setProfileSuspended = async (
	payload: Payload,
	userId: string,
	suspended: boolean,
): Promise<void> => {
	try {
		const profile = await loadProfileByUserId(payload, userId);
		if (!profile) return;

		await payload.update({
			collection: "wajakazi-profiles",
			id: profile.id,
			data: { suspended },
			overrideAccess: true,
		});
	} catch (error) {
		console.error("[services/moderation] profile suspension flag failed:", error);
	}
};

// suspends a wajakazi or mwajiri account. staff or admin, mandatory reason. locks
// the account, hides a wajakazi from the directory, and suspends a mwajiri's
// subscription so they can no longer reveal contacts
const suspendAccount = async (
	payload: Payload,
	actor: User,
	userId: string,
	reason: string,
): Promise<Result<User>> => {
	if (!isBackOffice(actor)) return fail("Forbidden", "forbidden");
	if (!reason.trim()) return fail("A suspension reason is required.", "reason_required");

	const target = await loadTargetUser(payload, userId);
	if (!target) return fail("Account not found.", "not_found");
	if (!isSaasAccount(target)) return fail("Not a wajakazi or mwajiri account.", "invalid_target");
	if (target.accountState === "suspended") {
		return fail("Account is already suspended.", "wrong_state");
	}

	const result = await applyAccountState(payload, userId, target.accountState, {
		accountState: "suspended",
		suspendedAt: new Date().toISOString(),
		suspensionReason: reason.trim(),
	});
	if (!result.success) return result;

	if (target.role === "mjakazi") {
		await setProfileSuspended(payload, userId, true);
	} else {
		const subscription = await getSubscriptionByUser(payload, userId);
		if (subscription) {
			const subResult = await suspendSubscription(payload, actor, subscription.id, reason);
			if (!subResult.success) {
				console.error(
					"[services/moderation] subscription suspend failed:",
					subResult.error,
				);
			}
		}
	}

	await writeAuditLog({
		action: "account_suspended",
		actorId: actor.id,
		actorLabel: userLabel(actor),
		targetId: target.id,
		targetLabel: userLabel(target),
		previousState: "active",
		newState: "suspended",
		reason: reason.trim(),
		metadata: { role: target.role },
	});

	return result;
};

// reinstates a suspended wajakazi or mwajiri account. admin only, mandatory
// reason. restores directory visibility for a wajakazi and the subscription for a
// mwajiri
const reinstateAccount = async (
	payload: Payload,
	actor: User,
	userId: string,
	reason: string,
): Promise<Result<User>> => {
	if (!isAdmin(actor)) return fail("Forbidden", "forbidden");
	if (!reason.trim()) return fail("A reinstatement reason is required.", "reason_required");

	const target = await loadTargetUser(payload, userId);
	if (!target) return fail("Account not found.", "not_found");
	if (!isSaasAccount(target)) return fail("Not a wajakazi or mwajiri account.", "invalid_target");
	if (target.accountState !== "suspended") {
		return fail("Account is not suspended.", "wrong_state");
	}

	const result = await applyAccountState(payload, userId, "suspended", {
		accountState: "active",
		suspendedAt: null,
		suspensionReason: null,
	});
	if (!result.success) return result;

	if (target.role === "mjakazi") {
		await setProfileSuspended(payload, userId, false);
	} else {
		const subscription = await getSubscriptionByUser(payload, userId);
		if (subscription) {
			const subResult = await reinstateSubscription(payload, actor, subscription.id);
			if (!subResult.success) {
				console.error(
					"[services/moderation] subscription reinstate failed:",
					subResult.error,
				);
			}
		}
	}

	await writeAuditLog({
		action: "account_reinstated",
		actorId: actor.id,
		actorLabel: userLabel(actor),
		targetId: target.id,
		targetLabel: userLabel(target),
		previousState: "suspended",
		newState: "active",
		reason: reason.trim(),
		metadata: { role: target.role },
	});

	return result;
};

export { reinstateAccount, suspendAccount };
