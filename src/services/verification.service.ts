import { addMonths } from "date-fns";
import type { Payload } from "payload";

import { writeAuditLog, type AuditAction } from "@/lib/audit";
import {
	sendVerificationApprovedEmail,
	sendVerificationRejectedEmail,
} from "@/lib/email";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/vault";
import type { Payment, User, WajakaziProfile } from "@/payload-types";
import { getOwnProfile } from "@/services/profile.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type VerificationState = NonNullable<WajakaziProfile["verificationState"]>;

// rejections covered by a single verification fee before the worker must pay
// again. the product spec is "up to 3 resubmissions included" — three rejections
// are retried for free, the fourth requires a fresh fee
const FREE_REJECTIONS = 3;

// a verified badge is valid for 12 months from approval
const VERIFICATION_VALIDITY_MONTHS = 12;

// the whitelist of legal transitions. each entry lists the states reachable from
// its key; anything not listed — including a no-op from === to — is refused.
// blacklisting and deactivation are reachable from every live state and are
// terminal (no outgoing transitions)
const TRANSITIONS: Record<VerificationState, VerificationState[]> = {
	draft: ["pending_payment", "blacklisted", "deactivated"],
	pending_payment: ["pending_review", "blacklisted", "deactivated"],
	pending_review: ["verified", "rejected", "blacklisted", "deactivated"],
	verified: ["pending_review", "verification_expired", "blacklisted", "deactivated"],
	rejected: ["pending_review", "pending_payment", "blacklisted", "deactivated"],
	verification_expired: ["pending_payment", "blacklisted", "deactivated"],
	blacklisted: [],
	deactivated: [],
};

// only the verification bookkeeping fields — the state itself is passed separately
type VerificationData = Partial<
	Pick<
		WajakaziProfile,
		| "verificationSubmittedAt"
		| "verificationReviewedAt"
		| "verificationExpiry"
		| "verificationAttempts"
		| "lastVerificationPaymentId"
		| "blacklistedAt"
		| "deactivatedAt"
		| "rejectionReason"
		| "verificationNotes"
	>
>;

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

const isLegalTransition = (from: VerificationState, to: VerificationState): boolean =>
	TRANSITIONS[from].includes(to);

const isMjakazi = (user: User): boolean => user.role === "mjakazi";
const isStaff = (user: User): boolean => user.role === "admin" || user.role === "staff";
const isAdmin = (user: User): boolean => user.role === "admin";

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

// resolves a profile by id under the caller's access. staff/admin read any
// profile; anyone else is scoped to their own by the collection read gate, so a
// non-staff caller resolving someone else's id gets nothing back
const loadProfileForActor = async (
	payload: Payload,
	actor: User,
	profileId: string,
): Promise<WajakaziProfile | null> => {
	try {
		const result = await payload.find({
			collection: "wajakazi-profiles",
			where: { id: { equals: profileId } },
			limit: 1,
			overrideAccess: false,
			req: { user: actor },
		});
		return result.docs[0] ?? null;
	} catch {
		return null;
	}
};

// trusted system read for transitions with no authenticated session (payment
// confirmation, expiry job, identity-change revert)
const loadProfileById = async (
	payload: Payload,
	profileId: string,
): Promise<WajakaziProfile | null> => {
	try {
		return await payload.findByID({
			collection: "wajakazi-profiles",
			id: profileId,
			depth: 0,
		});
	} catch {
		return null;
	}
};

// trusted system read resolving the profile for a given user id — used when the
// caller has a payment but no session (the callback) and needs the profile to
// transition. profiles are 1:1 with users, so this returns at most one record
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

// the worker who owns the profile, resolved for a notification send. a trusted
// read: the email is used only as a send destination, never returned to the client
const loadWorkerEmail = async (
	payload: Payload,
	profile: WajakaziProfile,
): Promise<{ email: string; firstName: string } | null> => {
	const userId = toId(profile.user);
	if (!userId) return null;

	try {
		const user = await payload.findByID({
			collection: "users",
			id: userId,
			depth: 0,
		});
		if (!user?.email) return null;
		return { email: user.email, firstName: user.firstName ?? "there" };
	} catch {
		return null;
	}
};

// fire-and-forget notification. the transition is already committed by the time
// this runs, so a failed send is logged and the verified/rejected state stands
const notifyWorker = async (
	payload: Payload,
	profile: WajakaziProfile,
	outcome:
		| { type: "approved" }
		| { type: "rejected"; reason: string; attemptsRemaining: number },
): Promise<void> => {
	try {
		const recipient = await loadWorkerEmail(payload, profile);
		if (!recipient) return;

		if (outcome.type === "approved") {
			await sendVerificationApprovedEmail({
				payload,
				to: recipient.email,
				firstName: recipient.firstName,
			});
		} else {
			await sendVerificationRejectedEmail({
				payload,
				to: recipient.email,
				firstName: recipient.firstName,
				rejectionReason: outcome.reason,
				attemptsRemaining: outcome.attemptsRemaining,
			});
		}
	} catch (error) {
		console.error("[services/verification] notification email failed:", error);
	}
};

// both vault document types must be present. this is a trusted count — the
// caller has already proven ownership of the profile, and only the set of
// document types is inspected, never the bytes
const hasBothDocuments = async (
	payload: Payload,
	profileId: string,
): Promise<boolean> => {
	const result = await payload.find({
		collection: "vault-documents",
		where: { profile: { equals: profileId } },
		limit: 100,
	});
	const present = new Set(result.docs.map((document) => document.documentType));
	return DOCUMENT_TYPE_OPTIONS.every((option) => present.has(option.value));
};

// the shared guard for any worker-initiated entry into review: the profile is
// complete and both documents are uploaded. the guard lives here, not in the UI,
// so a service-level call can never skip it
const assessReadiness = async (
	payload: Payload,
	profile: WajakaziProfile,
): Promise<Result> => {
	if (profile.profileComplete !== true) {
		return fail(
			"Complete your profile before submitting for verification.",
			"incomplete",
		);
	}

	if (!(await hasBothDocuments(payload, profile.id))) {
		return fail(
			"Upload both identity documents before submitting for verification.",
			"missing_documents",
		);
	}

	return { success: true, data: undefined };
};

const auditTransition = async ({
	action,
	actor,
	profile,
	previousState,
	nextState,
	reason,
	metadata,
	source,
}: {
	action: AuditAction;
	actor: User | null;
	profile: WajakaziProfile;
	previousState: VerificationState;
	nextState: VerificationState;
	reason?: string;
	metadata?: Record<string, unknown>;
	source: "user" | "system";
}): Promise<void> => {
	const ownerId = toId(profile.user);

	await writeAuditLog({
		action,
		actorId: actor?.id ?? null,
		actorLabel: actor ? userLabel(actor) : null,
		targetId: ownerId,
		targetLabel: null,
		previousState,
		newState: nextState,
		reason,
		metadata,
		source,
	});
};

type ApplyTransitionInput = {
	payload: Payload;
	profile: WajakaziProfile;
	nextState: VerificationState;
	data?: VerificationData;
	action: AuditAction;
	actor: User | null;
	source?: "user" | "system";
	reason?: string;
	metadata?: Record<string, unknown>;
};

const applyTransition = async ({
	payload,
	profile,
	nextState,
	data = {},
	action,
	actor,
	source = "user",
	reason,
	metadata,
}: ApplyTransitionInput): Promise<Result<WajakaziProfile>> => {
	const previousState = profile.verificationState;

	if (!isLegalTransition(previousState, nextState)) {
		return fail(
			`Invalid transition: ${previousState} → ${nextState}.`,
			"illegal_transition",
		);
	}

	try {
		// compare-and-swap: the write only lands if the state is still exactly
		// what we observed, so a concurrent transition loses instead of silently
		// double-applying. the write is a trusted overrideAccess because the
		// verification fields are field-locked to staff/admin and authorization
		// already happened in the caller
		const result = await payload.update({
			collection: "wajakazi-profiles",
			where: {
				and: [
					{ id: { equals: profile.id } },
					{ verificationState: { equals: previousState } },
				],
			},
			data: { verificationState: nextState, ...data },
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			return fail(
				"Verification state changed. Please refresh and try again.",
				"conflict",
			);
		}

		const updated = result.docs[0];

		await auditTransition({
			action,
			actor,
			profile,
			previousState,
			nextState,
			reason,
			metadata,
			source,
		});

		return { success: true, data: updated };
	} catch (error) {
		console.error("[services/verification] transition failed:", error);
		return fail("Could not update the verification state.");
	}
};

// draft → pending_payment. the initial submission; the fee is charged on the
// subsequent payment, not here
const submitForVerification = async (
	payload: Payload,
	user: User,
): Promise<Result<WajakaziProfile>> => {
	if (!isMjakazi(user)) return fail("Forbidden", "forbidden");

	const profile = await getOwnProfile(payload, user);
	if (!profile) return fail("Profile not found.", "not_found");
	if (profile.verificationState !== "draft") {
		return fail("Profile is not in draft.", "wrong_state");
	}

	const readiness = await assessReadiness(payload, profile);
	if (!readiness.success) return readiness;

	return applyTransition({
		payload,
		profile,
		nextState: "pending_payment",
		data: {
			verificationSubmittedAt: new Date().toISOString(),
			rejectionReason: null,
		},
		action: "verification_submitted",
		actor: user,
	});
};

// rejected → pending_review (free) or pending_payment (paid). rejections within
// the free window re-enter review directly; past it the worker pays for a new
// cycle, which resets the attempt count on the next confirmed payment
const resubmitForVerification = async (
	payload: Payload,
	user: User,
): Promise<Result<WajakaziProfile>> => {
	if (!isMjakazi(user)) return fail("Forbidden", "forbidden");

	const profile = await getOwnProfile(payload, user);
	if (!profile) return fail("Profile not found.", "not_found");
	if (profile.verificationState !== "rejected") {
		return fail("Profile is not awaiting resubmission.", "wrong_state");
	}

	const readiness = await assessReadiness(payload, profile);
	if (!readiness.success) return readiness;

	const attempts = profile.verificationAttempts ?? 0;

	if (attempts <= FREE_REJECTIONS) {
		return applyTransition({
			payload,
			profile,
			nextState: "pending_review",
			data: { verificationSubmittedAt: new Date().toISOString() },
			action: "verification_resubmitted",
			actor: user,
			metadata: { attemptNumber: attempts },
		});
	}

	return applyTransition({
		payload,
		profile,
		nextState: "pending_payment",
		data: {
			verificationSubmittedAt: new Date().toISOString(),
			rejectionReason: null,
		},
		action: "verification_submitted",
		actor: user,
		metadata: { reason: "free resubmissions exhausted" },
	});
};

// verification_expired → pending_payment. re-verification after expiry is a
// fresh fee
const renewVerification = async (
	payload: Payload,
	user: User,
): Promise<Result<WajakaziProfile>> => {
	if (!isMjakazi(user)) return fail("Forbidden", "forbidden");

	const profile = await getOwnProfile(payload, user);
	if (!profile) return fail("Profile not found.", "not_found");
	if (profile.verificationState !== "verification_expired") {
		return fail("Profile is not expired.", "wrong_state");
	}

	const readiness = await assessReadiness(payload, profile);
	if (!readiness.success) return readiness;

	return applyTransition({
		payload,
		profile,
		nextState: "pending_payment",
		data: {
			verificationSubmittedAt: new Date().toISOString(),
			rejectionReason: null,
		},
		action: "verification_submitted",
		actor: user,
		metadata: { reason: "renewal after expiry" },
	});
};

// pending_payment → pending_review. the only caller is the payment path in
// Phase 4.4 — no bypass, no mock. stores the payment reference and resets the
// attempt count so a fresh cycle starts clean
const advanceToReview = async (
	payload: Payload,
	profileId: string,
	paymentId?: string,
): Promise<Result<WajakaziProfile>> => {
	const profile = await loadProfileById(payload, profileId);
	if (!profile) return fail("Profile not found.", "not_found");
	if (profile.verificationState !== "pending_payment") {
		return fail("Profile is not awaiting payment.", "wrong_state");
	}

	return applyTransition({
		payload,
		profile,
		nextState: "pending_review",
		data: {
			verificationAttempts: 0,
			lastVerificationPaymentId: paymentId ?? null,
		},
		action: "verification_advanced",
		actor: null,
		source: "system",
	});
};

// the 4.4 wire-up: a confirmed verification payment moves the profile from
// pending_payment to pending_review and records the payment reference. called
// from the payment service after the callback confirms. the profile's current
// state is the idempotency guard, so a repeated activation is refused rather
// than double-applied
const activateVerificationOnPayment = async (
	payload: Payload,
	payment: Payment,
): Promise<Result<WajakaziProfile>> => {
	const userId = toId(payment.user);
	if (!userId) return fail("Payment has no payer.", "missing_user");

	const profile = await loadProfileByUserId(payload, userId);
	if (!profile) return fail("Profile not found.", "not_found");

	return advanceToReview(payload, profile.id, payment.id);
};

// pending_review → verified. sets the 12-month expiry and records the reviewer
const approveVerification = async (
	payload: Payload,
	actor: User,
	profileId: string,
	notes?: string,
): Promise<Result<WajakaziProfile>> => {
	if (!isStaff(actor)) return fail("Forbidden", "forbidden");

	const profile = await loadProfileForActor(payload, actor, profileId);
	if (!profile) return fail("Profile not found.", "not_found");
	if (profile.verificationState !== "pending_review") {
		return fail("Profile is not pending review.", "wrong_state");
	}

	const result = await applyTransition({
		payload,
		profile,
		nextState: "verified",
		data: {
			verificationReviewedAt: new Date().toISOString(),
			verificationExpiry: addMonths(
				new Date(),
				VERIFICATION_VALIDITY_MONTHS,
			).toISOString(),
			rejectionReason: null,
			verificationNotes: notes ?? null,
		},
		action: "verification_approved",
		actor,
	});

	if (result.success) {
		await notifyWorker(payload, result.data, { type: "approved" });
	}

	return result;
};

// pending_review → rejected. a mandatory reason, and the attempt count increments
const rejectVerification = async (
	payload: Payload,
	actor: User,
	profileId: string,
	reason: string,
): Promise<Result<WajakaziProfile>> => {
	if (!isStaff(actor)) return fail("Forbidden", "forbidden");

	if (!reason.trim()) {
		return fail("A rejection reason is required.", "reason_required");
	}

	const profile = await loadProfileForActor(payload, actor, profileId);
	if (!profile) return fail("Profile not found.", "not_found");
	if (profile.verificationState !== "pending_review") {
		return fail("Profile is not pending review.", "wrong_state");
	}

	const attempts = (profile.verificationAttempts ?? 0) + 1;

	const result = await applyTransition({
		payload,
		profile,
		nextState: "rejected",
		data: {
			verificationReviewedAt: new Date().toISOString(),
			rejectionReason: reason.trim(),
			verificationAttempts: attempts,
		},
		action: "verification_rejected",
		actor,
		reason: reason.trim(),
		metadata: { attemptNumber: attempts },
	});

	if (result.success) {
		await notifyWorker(payload, result.data, {
			type: "rejected",
			reason: reason.trim(),
			attemptsRemaining: Math.max(0, FREE_REJECTIONS - attempts),
		});
	}

	return result;
};

// verified → pending_review. triggered when a verified worker changes their legal
// name or ID document. no caller in this phase — the trigger lands with the
// profile/document edit flows
const revertToReview = async (
	payload: Payload,
	profileId: string,
): Promise<Result<WajakaziProfile>> => {
	const profile = await loadProfileById(payload, profileId);
	if (!profile) return fail("Profile not found.", "not_found");
	if (profile.verificationState !== "verified") {
		return fail("Profile is not verified.", "wrong_state");
	}

	return applyTransition({
		payload,
		profile,
		nextState: "pending_review",
		data: { verificationExpiry: null },
		action: "verification_reverted",
		actor: null,
		source: "system",
	});
};

// verified → verification_expired. driven by the expiry job in Phase 7.1; no
// caller in this phase
const expireVerification = async (
	payload: Payload,
	profileId: string,
): Promise<Result<WajakaziProfile>> => {
	const profile = await loadProfileById(payload, profileId);
	if (!profile) return fail("Profile not found.", "not_found");
	if (profile.verificationState !== "verified") {
		return fail("Profile is not verified.", "wrong_state");
	}

	if (!profile.verificationExpiry || new Date(profile.verificationExpiry) > new Date()) {
		return fail("Verification has not yet expired.", "not_expired");
	}

	return applyTransition({
		payload,
		profile,
		nextState: "verification_expired",
		action: "verification_expired",
		actor: null,
		source: "system",
	});
};

// any live state → blacklisted. admin only, terminal, mandatory reason
const blacklistProfile = async (
	payload: Payload,
	actor: User,
	profileId: string,
	reason: string,
): Promise<Result<WajakaziProfile>> => {
	if (!isAdmin(actor)) return fail("Forbidden", "forbidden");

	if (!reason.trim()) {
		return fail("A blacklist reason is required.", "reason_required");
	}

	const profile = await loadProfileForActor(payload, actor, profileId);
	if (!profile) return fail("Profile not found.", "not_found");

	return applyTransition({
		payload,
		profile,
		nextState: "blacklisted",
		data: { blacklistedAt: new Date().toISOString() },
		action: "verification_blacklisted",
		actor,
		reason: reason.trim(),
	});
};

// any live state → deactivated. terminal; triggered by account deletion/erasure
const deactivateProfile = async (
	payload: Payload,
	actor: User | null,
	profileId: string,
): Promise<Result<WajakaziProfile>> => {
	if (actor && !isAdmin(actor)) return fail("Forbidden", "forbidden");

	const profile = actor
		? await loadProfileForActor(payload, actor, profileId)
		: await loadProfileById(payload, profileId);
	if (!profile) return fail("Profile not found.", "not_found");

	return applyTransition({
		payload,
		profile,
		nextState: "deactivated",
		data: { deactivatedAt: new Date().toISOString() },
		action: "verification_deactivated",
		actor,
		source: actor ? "user" : "system",
	});
};

type PendingReview = {
	id: string;
	displayName: string;
	legalFirstName: string | null;
	legalLastName: string | null;
	verificationSubmittedAt: string | null;
	verificationAttempts: number | null;
};

// the staff review queue — every profile in pending_review, oldest submission
// first. a read, not a transition, so no audit entry is written here
const listPendingReviews = async (
	payload: Payload,
	actor: User,
): Promise<Result<PendingReview[]>> => {
	if (!isStaff(actor)) return fail("Forbidden", "forbidden");

	try {
		const result = await payload.find({
			collection: "wajakazi-profiles",
			where: { verificationState: { equals: "pending_review" } },
			sort: "verificationSubmittedAt",
			limit: 100,
			select: {
				displayName: true,
				legalFirstName: true,
				legalLastName: true,
				verificationSubmittedAt: true,
				verificationAttempts: true,
			},
			overrideAccess: false,
			req: { user: actor },
		});

		const docs: PendingReview[] = result.docs.map((profile) => ({
			id: profile.id,
			displayName: profile.displayName,
			legalFirstName: profile.legalFirstName ?? null,
			legalLastName: profile.legalLastName ?? null,
			verificationSubmittedAt: profile.verificationSubmittedAt ?? null,
			verificationAttempts: profile.verificationAttempts ?? null,
		}));

		return { success: true, data: docs };
	} catch (error) {
		console.error("[services/verification] listPendingReviews failed:", error);
		return { success: false, error: "Could not load the review queue." };
	}
};

export {
	activateVerificationOnPayment,
	advanceToReview,
	approveVerification,
	blacklistProfile,
	deactivateProfile,
	expireVerification,
	listPendingReviews,
	rejectVerification,
	renewVerification,
	resubmitForVerification,
	revertToReview,
	submitForVerification,
};
export type { PendingReview };
