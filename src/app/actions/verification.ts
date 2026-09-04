"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import {
	approveVerification,
	rejectVerification,
	resubmitForVerification,
	submitForVerification,
} from "@/services/verification.service";

type ActionResult = {
	success: boolean;
	error?: string;
	code?: string;
};

// surfaces the underlying message of an unexpected throw so a failed server
// action shows the real cause rather than a generic phrase. the full error is
// still logged server-side
const errorMessage = (error: unknown, fallback: string): string => {
	if (error instanceof Error && error.message) return error.message;
	if (typeof error === "string" && error.trim()) return error;
	return fallback;
};

// stages a complete profile for verification (draft → pending_payment). the
// readiness guard (complete profile + both documents) lives in the service; this
// action only authenticates, authorizes and delegates
const submitForVerificationAction = async (): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return { success: false, error: "You must be signed in." };
		}
		if (user.role !== "mjakazi") {
			return { success: false, error: "Forbidden." };
		}

		const payload = await getPayload({ config });
		const result = await submitForVerification(payload, user);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mjakazi");
		revalidatePath("/dashboard/mjakazi/verification");

		return { success: true };
	} catch (error) {
		console.error("[actions/verification] submitForVerification failed:", error);
		return {
			success: false,
			error: errorMessage(error, "Could not submit your profile."),
		};
	}
};

// rejected → pending_review (free resubmissions remaining) or pending_payment
// (attempts exhausted). the service decides the destination and re-checks
// readiness; this action only authenticates and delegates
const resubmitForVerificationAction = async (): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return { success: false, error: "You must be signed in." };
		}
		if (user.role !== "mjakazi") {
			return { success: false, error: "Forbidden." };
		}

		const payload = await getPayload({ config });
		const result = await resubmitForVerification(payload, user);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mjakazi");
		revalidatePath("/dashboard/mjakazi/verification");

		return { success: true };
	} catch (error) {
		console.error("[actions/verification] resubmitForVerification failed:", error);
		return {
			success: false,
			error: errorMessage(error, "Could not resubmit your profile."),
		};
	}
};

const isBackOffice = (user: { role: string }): boolean =>
	user.role === "admin" || user.role === "staff";

const rejectionReasonSchema = z.string().trim().min(1, "A rejection reason is required.");

// pending_review → verified. staff/admin only; the service sets the 12-month
// expiry and writes the audit entry
const approveVerificationAction = async (profileId: string): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return { success: false, error: "You must be signed in." };
		}
		if (!isBackOffice(user)) {
			return { success: false, error: "Forbidden." };
		}

		const payload = await getPayload({ config });
		const result = await approveVerification(payload, user, profileId);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/staff/verifications");
		return { success: true };
	} catch (error) {
		console.error("[actions/verification] approveVerification failed:", error);
		return {
			success: false,
			error: errorMessage(error, "Could not approve the verification."),
		};
	}
};

// pending_review → rejected. staff/admin only; a non-empty reason is required
// and the service increments the attempt count
const rejectVerificationAction = async (
	profileId: string,
	reason: string,
): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return { success: false, error: "You must be signed in." };
		}
		if (!isBackOffice(user)) {
			return { success: false, error: "Forbidden." };
		}

		const parsed = rejectionReasonSchema.safeParse(reason);
		if (!parsed.success) {
			return { success: false, error: "A rejection reason is required." };
		}

		const payload = await getPayload({ config });
		const result = await rejectVerification(payload, user, profileId, parsed.data);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/staff/verifications");
		return { success: true };
	} catch (error) {
		console.error("[actions/verification] rejectVerification failed:", error);
		return {
			success: false,
			error: errorMessage(error, "Could not reject the verification."),
		};
	}
};

export {
	approveVerificationAction,
	rejectVerificationAction,
	resubmitForVerificationAction,
	submitForVerificationAction,
};
