"use server";

import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { normalizeKenyanPhone } from "@/lib/phone";
import config from "@/payload-config";
import { initiatePayment } from "@/services/payment.service";
import { getOwnProfile } from "@/services/profile.service";
import { getVerificationFee } from "@/services/settings.service";

type ActionResult = {
	success: boolean;
	error?: string;
	code?: string;
};

// the client sends only a phone number — the fee comes from platform-settings
// and identity from the session, never trusted from the browser
const initiateVerificationPaymentSchema = z.object({
	phone: z.string().min(1),
});

// initiates the one-time verification fee for a mjakazi in pending_payment. the
// amount comes from platform-settings; the phone defaults to the profile number
// in the ui but may be any number the mjakazi chooses to pay from. the stk push
// lands the payment at stk_sent; confirmation is the daraja callback's job, not
// this action's
const initiateVerificationPaymentAction = async (
	input: unknown,
): Promise<ActionResult> => {
	try {
		const parsed = initiateVerificationPaymentSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Enter your phone number." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mjakazi") return { success: false, error: "Forbidden." };

		const phone = normalizeKenyanPhone(parsed.data.phone);
		if (!phone) {
			return { success: false, error: "Enter a valid Kenyan phone number." };
		}

		const payload = await getPayload({ config });
		const profile = await getOwnProfile(payload, user);
		if (!profile) return { success: false, error: "Profile not found." };
		if (profile.verificationState !== "pending_payment") {
			return { success: false, error: "Your profile is not awaiting payment." };
		}

		const amount = await getVerificationFee(payload);
		if (amount === null) {
			return { success: false, error: "The verification fee is not configured." };
		}

		const result = await initiatePayment(payload, user, {
			paymentType: "verification",
			amount,
			phoneNumber: phone,
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
