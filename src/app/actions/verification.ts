"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import {
	approveVerification,
	rejectVerification,
	submitForVerification,
} from "@/services/verification.service";

type ActionResult = {
	success: boolean;
	error?: string;
	code?: string;
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
		return { success: false, error: "Could not submit your profile." };
	}
};

const isBackOffice = (user: { role: string }): boolean =>
	user.role === "admin" || user.role === "staff";

const rejectionReasonSchema = z
	.string()
	.trim()
	.min(1, "A rejection reason is required.");

const noteSchema = z
	.string()
	.trim()
	.max(1000, "Note must be under 1000 characters.");

// pending_review → verified. staff/admin only; the service sets the 12-month
// expiry and writes the audit entry. an optional internal note is stored on the
// profile for the staff record
const approveVerificationAction = async (
	profileId: string,
	notes?: string,
): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return { success: false, error: "You must be signed in." };
		}
		if (!isBackOffice(user)) {
			return { success: false, error: "Forbidden." };
		}

		const trimmed = notes?.trim() ?? "";
		if (trimmed) {
			const parsed = noteSchema.safeParse(trimmed);
			if (!parsed.success) {
				return { success: false, error: parsed.error.issues[0]?.message ?? "Note is too long." };
			}
		}

		const payload = await getPayload({ config });
		const result = await approveVerification(payload, user, profileId, trimmed || undefined);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/staff/verifications");
		return { success: true };
	} catch (error) {
		console.error("[actions/verification] approveVerification failed:", error);
		return { success: false, error: "Could not approve the verification." };
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
		return { success: false, error: "Could not reject the verification." };
	}
};

export { approveVerificationAction, rejectVerificationAction, submitForVerificationAction };
