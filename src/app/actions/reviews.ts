"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import {
	approveReview,
	rejectReview,
	setReviewVisibility,
	submitReview,
} from "@/services/review.service";

type ActionResult = { success: boolean; error?: string; code?: string };

const isBackOffice = (user: { role: string }): boolean =>
	user.role === "admin" || user.role === "staff";

const submitReviewSchema = z.object({
	mjakaziId: z.string().min(1),
	rating: z.number().int().min(1).max(5),
	comment: z.string().trim().min(1).max(1000),
});

const visibilitySchema = z.object({
	reviewId: z.string().min(1),
	hidden: z.boolean(),
});

const rejectionReasonSchema = z.string().trim().min(1, "A rejection reason is required.");

// a mwajiri leaves a review. the unlock + agreed-hire gate, the one-per-pair rule
// and the pending start all live in the service; this only authenticates,
// authorizes and delegates
const submitReviewAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = submitReviewSchema.safeParse(input);
		if (!parsed.success) {
			return {
				success: false,
				error: "Rate the wajakazi from 1 to 5 stars and write a short comment.",
			};
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mwajiri") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await submitReview(payload, user, parsed.data.mjakaziId, {
			rating: parsed.data.rating,
			comment: parsed.data.comment,
		});

		if (!result.success)
			return { success: false, error: result.error, code: result.code };

		revalidatePath("/dashboard/mwajiri/browse");
		revalidatePath("/dashboard/mwajiri");
		return { success: true };
	} catch (error) {
		console.error("[actions/reviews] submitReview failed:", error);
		return { success: false, error: "Could not submit your review." };
	}
};

// a mjakazi shows or hides one of their published reviews
const setReviewVisibilityAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = visibilitySchema.safeParse(input);
		if (!parsed.success) return { success: false, error: "Invalid request." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mjakazi") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await setReviewVisibility(
			payload,
			user,
			parsed.data.reviewId,
			parsed.data.hidden,
		);

		if (!result.success)
			return { success: false, error: result.error, code: result.code };

		revalidatePath("/dashboard/mjakazi");
		return { success: true };
	} catch (error) {
		console.error("[actions/reviews] setReviewVisibility failed:", error);
		return { success: false, error: "Could not update the review." };
	}
};

// pending → published. staff/admin only
const approveReviewAction = async (reviewId: string): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (!isBackOffice(user)) return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await approveReview(payload, user, reviewId);

		if (!result.success)
			return { success: false, error: result.error, code: result.code };

		revalidatePath("/dashboard/staff/reviews");
		return { success: true };
	} catch (error) {
		console.error("[actions/reviews] approveReview failed:", error);
		return { success: false, error: "Could not approve the review." };
	}
};

// pending → rejected. staff/admin only; a reason is mandatory
const rejectReviewAction = async (
	reviewId: string,
	reason: string,
): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (!isBackOffice(user)) return { success: false, error: "Forbidden." };

		const parsed = rejectionReasonSchema.safeParse(reason);
		if (!parsed.success) {
			return { success: false, error: "A rejection reason is required." };
		}

		const payload = await getPayload({ config });
		const result = await rejectReview(payload, user, reviewId, parsed.data);

		if (!result.success)
			return { success: false, error: result.error, code: result.code };

		revalidatePath("/dashboard/staff/reviews");
		return { success: true };
	} catch (error) {
		console.error("[actions/reviews] rejectReview failed:", error);
		return { success: false, error: "Could not reject the review." };
	}
};

export {
	approveReviewAction,
	rejectReviewAction,
	setReviewVisibilityAction,
	submitReviewAction,
};
