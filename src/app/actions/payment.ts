"use server";

import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { initiatePayment } from "@/services/payment.service";
import { getOwnProfile } from "@/services/profile.service";
import { getVerificationFee } from "@/services/settings.service";

type ActionResult = {
	success: boolean;
	error?: string;
	code?: string;
};

// initiates the one-time verification fee for a mjakazi in pending_payment. the
// amount and phone come from platform-settings and the profile respectively —
// nothing the client sends is trusted. the stk push lands the payment at
// stk_sent; confirmation is the daraja callback's job, not this action's
const initiateVerificationPaymentAction = async (): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mjakazi") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const profile = await getOwnProfile(payload, user);
		if (!profile) return { success: false, error: "Profile not found." };
		if (profile.verificationState !== "pending_payment") {
			return { success: false, error: "Your profile is not awaiting payment." };
		}
		if (!profile.phone) {
			return { success: false, error: "Add a phone number to your profile first." };
		}

		const amount = await getVerificationFee(payload);
		if (amount === null) {
			return { success: false, error: "The verification fee is not configured." };
		}

		const result = await initiatePayment(payload, user, {
			paymentType: "verification",
			amount,
			phoneNumber: profile.phone,
		});

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		return { success: true };
	} catch (error) {
		console.error("[actions/payment] initiateVerificationPayment failed:", error);
		return { success: false, error: "Could not start the payment." };
	}
};

export { initiateVerificationPaymentAction };
