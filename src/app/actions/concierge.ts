"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import config from "@/payload-config";
import { getCurrentUser } from "@/components/admin/get-current-user";
import {
	claimConciergeCase,
	deliverConciergeShortlist,
	recordConciergeOutcome,
	requestConciergeReplacement,
	submitRequirementsBrief,
	type BriefInput,
} from "@/services/concierge.service";

const submitConciergeBriefAction = async (caseId: string, brief: BriefInput) => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false as const, error: "Unauthorised" };

		const payload = await getPayload({ config });
		const result = await submitRequirementsBrief(payload, user, caseId, brief);

		if (result.success) {
			revalidatePath("/dashboard/mwajiri/concierge");
			revalidatePath("/dashboard/mwajiri");
		}

		return result;
	} catch (error) {
		console.error("[actions/concierge.submitConciergeBriefAction]", error);
		return { success: false as const, error: "Could not submit requirements brief" };
	}
};

const claimConciergeCaseAction = async (caseId: string) => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false as const, error: "Unauthorised" };

		const payload = await getPayload({ config });
		const result = await claimConciergeCase(payload, user, caseId);

		if (result.success) {
			revalidatePath("/dashboard/staff/concierge");
			revalidatePath(`/dashboard/staff/concierge/${caseId}`);
		}

		return result;
	} catch (error) {
		console.error("[actions/concierge.claimConciergeCaseAction]", error);
		return { success: false as const, error: "Could not claim concierge case" };
	}
};

const deliverConciergeShortlistAction = async (
	caseId: string,
	shortlistItems: { candidateId: string; matchNote?: string }[],
) => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false as const, error: "Unauthorised" };

		const payload = await getPayload({ config });
		const result = await deliverConciergeShortlist(payload, user, caseId, shortlistItems);

		if (result.success) {
			revalidatePath("/dashboard/staff/concierge");
			revalidatePath(`/dashboard/staff/concierge/${caseId}`);
		}

		return result;
	} catch (error) {
		console.error("[actions/concierge.deliverConciergeShortlistAction]", error);
		return { success: false as const, error: "Could not deliver shortlist" };
	}
};

const recordConciergeOutcomeAction = async (
	caseId: string,
	outcome: "hired" | "none_suitable",
) => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false as const, error: "Unauthorised" };

		const payload = await getPayload({ config });
		const result = await recordConciergeOutcome(payload, user, caseId, outcome);

		if (result.success) {
			revalidatePath("/dashboard/mwajiri/concierge");
			revalidatePath("/dashboard/mwajiri");
		}

		return result;
	} catch (error) {
		console.error("[actions/concierge.recordConciergeOutcomeAction]", error);
		return { success: false as const, error: "Could not record outcome" };
	}
};

const requestConciergeReplacementAction = async (caseId: string) => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false as const, error: "Unauthorised" };

		const payload = await getPayload({ config });
		const result = await requestConciergeReplacement(payload, user, caseId);

		if (result.success) {
			revalidatePath("/dashboard/mwajiri/concierge");
			revalidatePath("/dashboard/mwajiri");
		}

		return result;
	} catch (error) {
		console.error("[actions/concierge.requestConciergeReplacementAction]", error);
		return { success: false as const, error: "Could not request replacement" };
	}
};

export {
	claimConciergeCaseAction,
	deliverConciergeShortlistAction,
	recordConciergeOutcomeAction,
	requestConciergeReplacementAction,
	submitConciergeBriefAction,
};
