import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import {
	sendConciergeBriefSubmittedEmail,
	sendConciergeShortlistDeliveredEmail,
	sendConciergeShortlistSharedEmail,
} from "@/lib/email";
import { loadUserName, toId, userLabel } from "@/lib/payload-helpers";
import { captureServerEvent } from "@/lib/posthog-server";
import { loadUserEmail } from "@/lib/user-email";
import type { ConciergeCase, User, WajakaziProfile } from "@/payload-types";
import { DIRECTORY_VISIBLE } from "@/payload/access/access-control";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type ConciergeState = NonNullable<ConciergeCase["state"]>;

export type BriefInput = {
	jobCategory: string;
	location: string;
	workPreference: "live_in" | "live_out" | "either";
	salaryMin: number;
	salaryMax: number;
	familyDetails: string;
	duties: string;
	specialRequirements?: string;
};

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

const loadCaseById = async (
	payload: Payload,
	caseId: string,
	depth = 1,
): Promise<ConciergeCase | null> => {
	try {
		return await payload.findByID({
			collection: "concierge-cases",
			id: caseId,
			depth,
			overrideAccess: true,
		});
	} catch {
		return null;
	}
};

// a candidate read for staff shortlisting. guarded with the actor's own request
// rather than overrideAccess, so concierge stays inside invariant #15 — staff
// read access already grants the whole profile, so nothing is widened
const loadCandidateForStaff = async (
	payload: Payload,
	actor: User,
	candidateId: string,
): Promise<WajakaziProfile | null> => {
	try {
		return await payload.findByID({
			collection: "wajakazi-profiles",
			id: candidateId,
			depth: 0,
			overrideAccess: false,
			req: { user: actor },
		});
	} catch {
		return null;
	}
};

// the hire-window half of the replacement guarantee: a hire both sides agreed to
// within 30 days. the case-level checks (outcome hired, guarantee unused) stay at
// the call site, so this is the one clock the card and the service both read
const hasRecentConfirmedHire = async (
	payload: Payload,
	mwajiriId: string,
): Promise<boolean> => {
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	try {
		const recentHires = await payload.find({
			collection: "hires",
			where: {
				and: [
					{ mwajiri: { equals: mwajiriId } },
					{ state: { equals: "agreed" } },
					{ confirmedAt: { greater_than_equal: thirtyDaysAgo.toISOString() } },
				],
			},
			limit: 1,
			overrideAccess: true,
		});
		return recentHires.docs.length > 0;
	} catch (error) {
		console.error("[services/concierge] hasRecentConfirmedHire failed:", error);
		return false;
	}
};

// removes grants created in a delivery attempt that then failed, so contacts are
// never left shared with no delivered shortlist behind them (invariant #24: a
// partial write is rolled back). only rows this call created are ever touched
const rollbackGrants = async (payload: Payload, grantIds: string[]): Promise<void> => {
	for (const grantId of grantIds) {
		try {
			await payload.delete({
				collection: "contact-unlocks",
				id: grantId,
				overrideAccess: true,
			});
		} catch (error) {
			console.error(`[services/concierge] grant rollback failed for ${grantId}:`, error);
		}
	}
};

// tells staff and admin a brief is waiting. email failure must never block the
// state transition (library-docs → Resend), so every send is best-effort. sends
// run sequentially: the recipient set is the whole back office, so a brief must
// not fan out one concurrent request per member
const notifyStaffOfBrief = async (
	payload: Payload,
	caseId: string,
	mwajiriName: string,
	brief: BriefInput,
): Promise<void> => {
	try {
		const recipients = await payload.find({
			collection: "users",
			where: {
				and: [
					{ role: { in: ["staff", "admin"] } },
					{ accountState: { equals: "active" } },
				],
			},
			limit: 100,
			depth: 0,
			overrideAccess: true,
		});

		for (const member of recipients.docs) {
			try {
				await sendConciergeBriefSubmittedEmail({
					payload,
					to: member.email,
					firstName: member.firstName ?? "there",
					mwajiriName,
					jobCategory: brief.jobCategory ?? null,
					location: brief.location ?? null,
					caseId,
				});
			} catch (error) {
				console.error(
					`[services/concierge] brief notification failed for user ${member.id}:`,
					error,
				);
			}
		}
	} catch (error) {
		console.error("[services/concierge] notifyStaffOfBrief failed:", error);
	}
};

// tells each shortlisted worker their contact was shared. they did not opt in,
// so the notification is the counterpart to the direct grant. best-effort
const notifyShortlistedCandidates = async (
	payload: Payload,
	candidates: { candidateId: string; ownerId: string | null }[],
	mwajiriId: string,
): Promise<void> => {
	const mwajiriName = (await loadUserName(payload, mwajiriId)) ?? "An employer";

	for (const item of candidates) {
		if (!item.ownerId) continue;
		try {
			const owner = await loadUserEmail(payload, item.ownerId);
			if (!owner) continue;
			await sendConciergeShortlistSharedEmail({
				payload,
				to: owner.email,
				firstName: owner.firstName,
				mwajiriName,
			});
		} catch (error) {
			console.error(
				`[services/concierge] shortlist notification failed for candidate ${item.candidateId}:`,
				error,
			);
		}
	}
};

// created automatically when a concierge tier payment confirms. a renewal reuses
// the mwajiri's open case; an upgrade onto a concierge tier passes forceNew, so
// each paid upgrade window gets its own case (and its own replacement guarantee)
// rather than silently extending an older one. concierge-cases carries no
// per-mwajiri unique index, so more than one open case is valid
const createConciergeCaseOnPayment = async (
	payload: Payload,
	mwajiriId: string,
	subscriptionId: string,
	options: { forceNew?: boolean } = {},
): Promise<Result<ConciergeCase>> => {
	try {
		if (options.forceNew !== true) {
			// check if an open (non-closed) concierge case already exists for this mwajiri
			const existing = await payload.find({
				collection: "concierge-cases",
				where: {
					and: [
						{ mwajiri: { equals: mwajiriId } },
						{
							state: {
								in: [
									"intake",
									"in_review",
									"shortlist_delivered",
									"replacement_requested",
								],
							},
						},
					],
				},
				limit: 1,
				overrideAccess: true,
			});

			if (existing.docs.length > 0) {
				return { success: true, data: existing.docs[0] };
			}
		}

		const conciergeCase = await payload.create({
			collection: "concierge-cases",
			data: {
				mwajiri: mwajiriId,
				subscription: subscriptionId,
				state: "intake",
			},
			overrideAccess: true,
		});

		await writeAuditLog({
			action: "concierge_case_created",
			actorId: null,
			targetId: mwajiriId,
			previousState: null,
			newState: "intake",
			metadata: { caseId: conciergeCase.id, subscriptionId },
			source: "system",
		});

		return { success: true, data: conciergeCase };
	} catch (error) {
		console.error("[services/concierge] createConciergeCaseOnPayment failed:", error);
		return fail("Could not create concierge case.");
	}
};

const getConciergeCaseForMwajiri = async (
	payload: Payload,
	user: User,
): Promise<ConciergeCase | null> => {
	if (user.role !== "mwajiri") return null;

	try {
		const result = await payload.find({
			collection: "concierge-cases",
			where: { mwajiri: { equals: user.id } },
			sort: "-createdAt",
			limit: 1,
			depth: 2,
			overrideAccess: false,
			req: { user },
		});

		return result.docs[0] ?? null;
	} catch (error) {
		console.error("[services/concierge] getConciergeCaseForMwajiri failed:", error);
		return null;
	}
};

const submitRequirementsBrief = async (
	payload: Payload,
	user: User,
	caseId: string,
	brief: BriefInput,
): Promise<Result<ConciergeCase>> => {
	if (user.role !== "mwajiri") return fail("Forbidden", "forbidden");

	const conciergeCase = await loadCaseById(payload, caseId, 0);
	if (!conciergeCase) return fail("Concierge case not found.", "not_found");

	if (toId(conciergeCase.mwajiri) !== user.id) {
		return fail("Forbidden", "forbidden");
	}

	if (
		conciergeCase.state !== "intake" &&
		conciergeCase.state !== "replacement_requested"
	) {
		return fail("Brief has already been submitted.", "invalid_state");
	}

	const previousState = conciergeCase.state;
	const submittedAt = new Date().toISOString();

	try {
		const updated = await payload.update({
			collection: "concierge-cases",
			id: caseId,
			data: {
				state: "in_review",
				brief: {
					...brief,
					submittedAt,
				},
			},
			overrideAccess: true,
		});

		await writeAuditLog({
			action: "concierge_brief_submitted",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: user.id,
			previousState,
			newState: "in_review",
			metadata: { caseId, brief },
			source: "user",
		});

		captureServerEvent({
			distinctId: user.clerkId ?? user.id,
			event: "concierge_brief_submitted",
		});

		await notifyStaffOfBrief(payload, caseId, userLabel(user), brief);

		return { success: true, data: updated };
	} catch (error) {
		console.error("[services/concierge] submitRequirementsBrief failed:", error);
		return fail("Could not submit requirements brief.");
	}
};

const listConciergeCases = async (
	payload: Payload,
	actor: User,
	stateFilter?: ConciergeState,
): Promise<ConciergeCase[]> => {
	if (actor.role !== "admin" && actor.role !== "staff") return [];

	try {
		const whereClause = stateFilter ? { state: { equals: stateFilter } } : undefined;
		const result = await payload.find({
			collection: "concierge-cases",
			where: whereClause,
			sort: "-updatedAt",
			limit: 100,
			depth: 2,
			overrideAccess: true,
		});

		return result.docs;
	} catch (error) {
		console.error("[services/concierge] listConciergeCases failed:", error);
		return [];
	}
};

const claimConciergeCase = async (
	payload: Payload,
	actor: User,
	caseId: string,
): Promise<Result<ConciergeCase>> => {
	if (actor.role !== "admin" && actor.role !== "staff") {
		return fail("Forbidden", "forbidden");
	}

	const conciergeCase = await loadCaseById(payload, caseId, 0);
	if (!conciergeCase) return fail("Concierge case not found.", "not_found");

	// closed is terminal. claiming it would re-open a case whose replacement
	// window has already been spent
	if (conciergeCase.state === "closed") {
		return fail("This case is closed and cannot be claimed.", "invalid_state");
	}

	const previousState = conciergeCase.state;
	const nextState = previousState === "intake" ? "in_review" : previousState;

	try {
		const updated = await payload.update({
			collection: "concierge-cases",
			id: caseId,
			data: {
				assignedTo: actor.id,
				state: nextState,
			},
			overrideAccess: true,
		});

		await writeAuditLog({
			action: "concierge_case_claimed",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: toId(conciergeCase.mwajiri),
			previousState,
			newState: nextState,
			metadata: { caseId, assignedTo: actor.id },
			source: "user",
		});

		return { success: true, data: updated };
	} catch (error) {
		console.error("[services/concierge] claimConciergeCase failed:", error);
		return fail("Could not claim concierge case.");
	}
};

const deliverConciergeShortlist = async (
	payload: Payload,
	actor: User,
	caseId: string,
	shortlistItems: { candidateId: string; matchNote?: string }[],
): Promise<Result<ConciergeCase>> => {
	if (actor.role !== "admin" && actor.role !== "staff") {
		return fail("Forbidden", "forbidden");
	}

	if (shortlistItems.length < 3 || shortlistItems.length > 5) {
		return fail(
			"Shortlist must contain between 3 and 5 candidates.",
			"invalid_shortlist",
		);
	}

	const conciergeCase = await loadCaseById(payload, caseId, 0);
	if (!conciergeCase) return fail("Concierge case not found.", "not_found");

	// only a case waiting on a shortlist can receive one. this stops a second
	// delivery from overwriting a delivered shortlist and re-emailing everyone
	if (
		conciergeCase.state !== "in_review" &&
		conciergeCase.state !== "replacement_requested"
	) {
		return fail("This case is not awaiting a shortlist.", "invalid_state");
	}

	const mwajiriId = toId(conciergeCase.mwajiri);
	const subscriptionId = toId(conciergeCase.subscription);
	if (!mwajiriId || !subscriptionId) {
		return fail("Case missing required associations.", "invalid_case");
	}

	// pass one — every candidate must still be eligible. the picker lists only
	// eligible profiles, but availability and verification can change between the
	// page load and delivery, so the decision is made here rather than trusted.
	// eligibility is the shared DIRECTORY_VISIBLE gate, so a change to it tightens
	// delivery instead of drifting from it
	const candidateIds = shortlistItems.map((item) => item.candidateId);
	const eligible = await payload.find({
		collection: "wajakazi-profiles",
		where: { and: [{ id: { in: candidateIds } }, DIRECTORY_VISIBLE] },
		limit: candidateIds.length,
		depth: 0,
		overrideAccess: false,
		req: { user: actor },
	});
	const eligibleIds = new Set(eligible.docs.map((doc) => String(doc.id)));

	const shortlistData: { candidate: string; matchNote: string }[] = [];
	const candidateOwners: { candidateId: string; ownerId: string | null }[] = [];

	for (const item of shortlistItems) {
		const profile = await loadCandidateForStaff(payload, actor, item.candidateId);
		if (!profile) {
			return fail(
				`Candidate ${item.candidateId} could not be found.`,
				"invalid_candidate",
			);
		}
		if (!eligibleIds.has(item.candidateId)) {
			return fail(
				`${profile.displayName} is no longer available for a shortlist.`,
				"invalid_candidate",
			);
		}

		shortlistData.push({
			candidate: item.candidateId,
			matchNote: item.matchNote ?? "",
		});
		candidateOwners.push({ candidateId: item.candidateId, ownerId: toId(profile.user) });
	}

	const ownerByCandidate = new Map(
		candidateOwners.map((entry) => [entry.candidateId, entry.ownerId]),
	);
	const deliveredAt = new Date().toISOString();

	// pass two — create the grants. idempotent, so an existing grant
	// short-circuits. rows created here are tracked so they can be rolled back if
	// the case write below fails
	const createdGrantIds: string[] = [];
	// grants created in this call, audited only after the case write commits — a
	// rolled-back delivery must not leave an immutable entry claiming a contact
	// was shared, and the audit log cannot be un-written
	const createdGrants: { candidateId: string; ownerId: string | null }[] = [];

	for (const item of shortlistItems) {
		try {
			const existingUnlock = await payload.find({
				collection: "contact-unlocks",
				where: {
					and: [
						{ mwajiri: { equals: mwajiriId } },
						{ mjakazi: { equals: item.candidateId } },
					],
				},
				limit: 1,
				overrideAccess: true,
			});

			if (existingUnlock.docs.length === 0) {
				const grant = await payload.create({
					collection: "contact-unlocks",
					data: {
						mwajiri: mwajiriId,
						mjakazi: item.candidateId,
						source: "concierge",
						tierAtUnlock: "Concierge Shortlist",
						unlockedAt: deliveredAt,
						subscription: subscriptionId,
					},
					overrideAccess: true,
				});
				createdGrantIds.push(grant.id);
				createdGrants.push({
					candidateId: item.candidateId,
					ownerId: ownerByCandidate.get(item.candidateId) ?? null,
				});
			}
		} catch (error) {
			console.error(
				`[services/concierge] unlock error for candidate ${item.candidateId}:`,
				error,
			);
			await rollbackGrants(payload, createdGrantIds);
			return fail("Failed processing candidate shortlist.", "grant_failed");
		}
	}

	const previousState = conciergeCase.state;

	let updated: ConciergeCase;
	try {
		updated = await payload.update({
			collection: "concierge-cases",
			id: caseId,
			data: {
				state: "shortlist_delivered",
				shortlist: shortlistData,
				deliveredAt,
			},
			overrideAccess: true,
		});
	} catch (error) {
		console.error("[services/concierge] deliverConciergeShortlist failed:", error);
		await rollbackGrants(payload, createdGrantIds);
		return fail("Could not deliver shortlist.");
	}

	await writeAuditLog({
		action: "concierge_shortlist_delivered",
		actorId: actor.id,
		actorLabel: userLabel(actor),
		targetId: mwajiriId,
		previousState,
		newState: "shortlist_delivered",
		metadata: { caseId, candidateCount: shortlistData.length },
		source: "user",
	});

	// the grants are durable now the case write has committed, so record each one
	// in the audit trail here rather than inside the loop above
	try {
		for (const entry of createdGrants) {
			await writeAuditLog({
				action: "contact_unlocked",
				actorId: actor.id,
				actorLabel: userLabel(actor),
				targetId: entry.ownerId,
				metadata: {
					mjakaziId: entry.candidateId,
					tierAtUnlock: "Concierge Shortlist",
					subscriptionId,
					source: "concierge_shortlist",
				},
				source: "user",
			});
		}
	} catch (error) {
		console.error("[services/concierge] contact unlock audit failed:", error);
	}

	let daysToDeliver = 0;
	if (conciergeCase.brief?.submittedAt) {
		const submittedTime = new Date(conciergeCase.brief.submittedAt).getTime();
		const deliveredTime = new Date(deliveredAt).getTime();
		daysToDeliver = Math.max(
			0,
			Math.round((deliveredTime - submittedTime) / (1000 * 60 * 60 * 24)),
		);
	}

	captureServerEvent({
		distinctId: actor.clerkId ?? actor.id,
		event: "concierge_shortlist_delivered",
		properties: {
			size: shortlistData.length,
			daysToDeliver,
		},
	});

	// best-effort notifications. a failed send never rolls back a delivered
	// shortlist (library-docs → Resend)
	const recipient = await loadUserEmail(payload, mwajiriId);
	if (recipient) {
		try {
			await sendConciergeShortlistDeliveredEmail({
				payload,
				to: recipient.email,
				firstName: recipient.firstName,
				candidateCount: shortlistData.length,
			});
		} catch (error) {
			console.error("[services/concierge] shortlist delivered email failed:", error);
		}
	}

	await notifyShortlistedCandidates(payload, candidateOwners, mwajiriId);

	return { success: true, data: updated };
};

const recordConciergeOutcome = async (
	payload: Payload,
	user: User,
	caseId: string,
	outcome: "hired" | "none_suitable",
): Promise<Result<ConciergeCase>> => {
	if (user.role !== "mwajiri") return fail("Forbidden", "forbidden");

	const conciergeCase = await loadCaseById(payload, caseId, 0);
	if (!conciergeCase) return fail("Concierge case not found.", "not_found");

	if (toId(conciergeCase.mwajiri) !== user.id) {
		return fail("Forbidden", "forbidden");
	}

	if (conciergeCase.state !== "shortlist_delivered") {
		return fail("Case must be in shortlist delivered state.", "invalid_state");
	}

	const previousState = conciergeCase.state;

	try {
		const updated = await payload.update({
			collection: "concierge-cases",
			id: caseId,
			data: {
				state: "closed",
				outcome,
			},
			overrideAccess: true,
		});

		await writeAuditLog({
			action: "concierge_outcome_recorded",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: user.id,
			previousState,
			newState: "closed",
			metadata: { caseId, outcome },
			source: "user",
		});

		return { success: true, data: updated };
	} catch (error) {
		console.error("[services/concierge] recordConciergeOutcome failed:", error);
		return fail("Could not record outcome.");
	}
};

const requestConciergeReplacement = async (
	payload: Payload,
	user: User,
	caseId: string,
): Promise<Result<ConciergeCase>> => {
	if (user.role !== "mwajiri") return fail("Forbidden", "forbidden");

	const conciergeCase = await loadCaseById(payload, caseId, 0);
	if (!conciergeCase) return fail("Concierge case not found.", "not_found");

	if (toId(conciergeCase.mwajiri) !== user.id) {
		return fail("Forbidden", "forbidden");
	}

	if (conciergeCase.state !== "closed") {
		return fail(
			"A replacement can only be requested once a case is closed.",
			"invalid_state",
		);
	}

	// the guarantee is tied to a concierge hire, which is the same condition the
	// mwajiri card checks before offering the button
	if (conciergeCase.outcome !== "hired") {
		return fail("A replacement requires a concierge hire.", "invalid_state");
	}

	if (conciergeCase.replacementUsedAt) {
		return fail("Replacement guarantee has already been used.", "already_used");
	}

	// the guarantee counts from a confirmed hire, so the 30-day window is the
	// same check the mwajiri card uses to decide whether to offer the button
	if (!(await hasRecentConfirmedHire(payload, user.id))) {
		return fail(
			"No eligible confirmed hire found within the 30-day window.",
			"no_eligible_hire",
		);
	}

	const previousState = conciergeCase.state;
	const replacementUsedAt = new Date().toISOString();

	try {
		const updated = await payload.update({
			collection: "concierge-cases",
			id: caseId,
			data: {
				state: "replacement_requested",
				replacementUsedAt,
			},
			overrideAccess: true,
		});

		await writeAuditLog({
			action: "concierge_replacement_requested",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: user.id,
			previousState,
			newState: "replacement_requested",
			metadata: { caseId },
			source: "user",
		});

		return { success: true, data: updated };
	} catch (error) {
		console.error("[services/concierge] requestConciergeReplacement failed:", error);
		return fail("Could not request replacement.");
	}
};

// the read-only profile a staff member sees when picking a candidate. the whole
// profile plus the contact vault (phone from the profile, email from the owner),
// so a shortlist is never built blind. guarded by the actor's own request — staff
// read access already grants this, so nothing is widened (invariant #15)
type StaffCandidateProfile = {
	profile: WajakaziProfile;
	email: string | null;
};

const getShortlistCandidateProfile = async (
	payload: Payload,
	actor: User,
	candidateId: string,
): Promise<Result<StaffCandidateProfile>> => {
	if (actor.role !== "admin" && actor.role !== "staff") {
		return fail("Forbidden", "forbidden");
	}

	const profile = await (async () => {
		try {
			return await payload.findByID({
				collection: "wajakazi-profiles",
				id: candidateId,
				depth: 1,
				overrideAccess: false,
				req: { user: actor },
			});
		} catch {
			return null;
		}
	})();
	if (!profile) return fail("Profile not found.", "not_found");

	// the contact vault is phone (profile) + email (owner). staff already read
	// both through their own access, so this never uses overrideAccess. depth 1
	// populates the owner, so the email is usually already here
	let email: string | null = null;
	if (typeof profile.user === "object" && profile.user) {
		email = profile.user.email ?? null;
	} else {
		const ownerId = toId(profile.user);
		if (ownerId) {
			try {
				const owner = await payload.findByID({
					collection: "users",
					id: ownerId,
					depth: 0,
					overrideAccess: false,
					req: { user: actor },
				});
				email = owner?.email ?? null;
			} catch {
				email = null;
			}
		}
	}

	return { success: true, data: { profile, email } };
};

export {
	claimConciergeCase,
	createConciergeCaseOnPayment,
	deliverConciergeShortlist,
	getConciergeCaseForMwajiri,
	getShortlistCandidateProfile,
	hasRecentConfirmedHire,
	listConciergeCases,
	recordConciergeOutcome,
	requestConciergeReplacement,
	submitRequirementsBrief,
};
export type { StaffCandidateProfile };
