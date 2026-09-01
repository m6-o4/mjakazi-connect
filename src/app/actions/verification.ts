"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { submitForVerification } from "@/services/verification.service";

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

export { submitForVerificationAction };
