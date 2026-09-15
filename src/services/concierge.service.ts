import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import { sendConciergeShortlistDeliveredEmail } from "@/lib/email";
import { toId, userLabel } from "@/lib/payload-helpers";
import { captureServerEvent } from "@/lib/posthog-server";
import { loadUserEmail } from "@/lib/user-email";
import type { ConciergeCase, User, WajakaziProfile } from "@/payload-types";

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

// created automatically when a concierge tier payment confirms
const createConciergeCaseOnPayment = async (
	payload: Payload,
	mwajiriId: string,
	subscriptionId: string,
): Promise<Result<ConciergeCase>> => {
	try {
		// check if an open (non-closed) concierge case already exists for this mwajiri
		const existing = await payload.find({
			collection: "concierge-cases",
			where: {
				and: [
					{ mwajiri: { equals: mwajiriId } },
					{
						state: {
							in: ["intake", "in_review", "shortlist_delivered", "replacement_requested"],
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

	const mwajiriId = toId(conciergeCase.mwajiri);
	const subscriptionId = toId(conciergeCase.subscription);
	if (!mwajiriId || !subscriptionId) {
		return fail("Case missing required associations.", "invalid_case");
	}

	// verify candidates exist and are verified wajakazi
	const shortlistData = [];
	const deliveredAt = new Date().toISOString();

	for (const item of shortlistItems) {
		try {
			const profile = (await payload.findByID({
				collection: "wajakazi-profiles",
				id: item.candidateId,
				depth: 0,
				overrideAccess: true,
			})) as WajakaziProfile | null;

			if (!profile || profile.verificationState !== "verified") {
				return fail(
					`Candidate ${item.candidateId} is not verified.`,
					"invalid_candidate",
				);
			}

			shortlistData.push({
				candidate: item.candidateId,
				matchNote: item.matchNote ?? "",
			});

			// create durable contact unlock for mwajiri if not already unlocked
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
				await payload.create({
					collection: "contact-unlocks",
					data: {
						mwajiri: mwajiriId,
						mjakazi: item.candidateId,
						tierAtUnlock: "Concierge Shortlist",
						unlockedAt: deliveredAt,
						subscription: subscriptionId,
					},
					overrideAccess: true,
				});

				await writeAuditLog({
					action: "contact_unlocked",
					actorId: actor.id,
					actorLabel: userLabel(actor),
					targetId: toId(profile.user),
					metadata: {
						mjakaziId: item.candidateId,
						tierAtUnlock: "Concierge Shortlist",
						subscriptionId,
						source: "concierge_shortlist",
					},
					source: "user",
				});
			}
		} catch (error) {
			console.error(
				`[services/concierge] unlock error for candidate ${item.candidateId}:`,
				error,
			);
			return fail("Failed processing candidate shortlist.");
		}
	}

	const previousState = conciergeCase.state;

	try {
		const updated = await payload.update({
			collection: "concierge-cases",
			id: caseId,
			data: {
				state: "shortlist_delivered",
				shortlist: shortlistData,
				deliveredAt,
			},
			overrideAccess: true,
		});

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

		// email notification to Mwajiri
		const recipient = await loadUserEmail(payload, mwajiriId);
		if (recipient) {
			await sendConciergeShortlistDeliveredEmail({
				payload,
				to: recipient.email,
				firstName: recipient.firstName,
				candidateCount: shortlistData.length,
			});
		}

		return { success: true, data: updated };
	} catch (error) {
		console.error("[services/concierge] deliverConciergeShortlist failed:", error);
		return fail("Could not deliver shortlist.");
	}
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

	if (conciergeCase.replacementUsedAt) {
		return fail("Replacement guarantee has already been used.", "already_used");
	}

	// verify that a hire was confirmed within the last 30 days
	const thirtyDaysAgo = new Date();
	thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

	const recentHires = await payload.find({
		collection: "hires",
		where: {
			and: [
				{ mwajiri: { equals: user.id } },
				{ state: { equals: "agreed" } },
				{ confirmedAt: { greater_than_equal: thirtyDaysAgo.toISOString() } },
			],
		},
		limit: 1,
		overrideAccess: true,
	});

	if (recentHires.docs.length === 0) {
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

export {
	claimConciergeCase,
	createConciergeCaseOnPayment,
	deliverConciergeShortlist,
	getConciergeCaseForMwajiri,
	listConciergeCases,
	recordConciergeOutcome,
	requestConciergeReplacement,
	submitRequirementsBrief,
};
