"use server";

import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { normalizeKenyanPhone } from "@/lib/phone";
import config from "@/payload-config";
import { initiatePayment } from "@/services/payment.service";
import { updateWaajiriPhone } from "@/services/profile.service";
import { getTierById } from "@/services/settings.service";
import { assertPlanChangeAllowed, beginPurchase } from "@/services/subscription.service";

type ActionResult = { success: boolean; error?: string; code?: string };

// the client sends only a tier id and a phone number — the price and duration
// are resolved server-side from platform-settings, never trusted from the browser
const initiateSubscriptionPaymentSchema = z.object({
	tierId: z.string().min(1),
	phone: z.string().min(1),
});

const initiateSubscriptionPaymentAction = async (
	input: unknown,
): Promise<ActionResult> => {
	try {
		const parsed = initiateSubscriptionPaymentSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Choose a plan and enter your phone number." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mwajiri") return { success: false, error: "Forbidden." };

		const phone = normalizeKenyanPhone(parsed.data.phone);
		if (!phone) {
			return { success: false, error: "Enter a valid Kenyan phone number." };
		}

		const payload = await getPayload({ config });

		const tier = await getTierById(payload, parsed.data.tierId);
		if (!tier) {
			return { success: false, error: "That plan is no longer available." };
		}

		// remember the phone for the next purchase. a failed write must not block
		// the payment, which uses the same phone for the stk push regardless
		const phoneSave = await updateWaajiriPhone(payload, user, phone);
		if (!phoneSave.success) {
			console.warn(`[actions/subscription] could not persist phone: ${phoneSave.error}`);
		}

		const purchase = await beginPurchase(payload, user);
		if (!purchase.success) {
			return { success: false, error: purchase.error, code: purchase.code };
		}

		// an active mwajiri may only renew or upgrade. this runs after beginPurchase —
		// a no-op for an active subscription, and the step that moves an expired one to
		// pending_payment — so the active path is still gated while the expired path is
		// not, and no stk push is sent for a refused downgrade
		const blocked = await assertPlanChangeAllowed(payload, purchase.data, tier);
		// `blocked` is only ever null or the failure branch, but the declared
		// `Result<never> | null` also admits the success variant, so narrow on the
		// discriminant to reach `error`/`code`
		if (blocked && !blocked.success) {
			return { success: false, error: blocked.error, code: blocked.code };
		}

		const result = await initiatePayment(payload, user, {
			paymentType: "subscription",
			amount: tier.price,
			phoneNumber: phone,
			tierId: tier.tierId,
			tierName: tier.name,
			tierDurationDays: tier.durationDays,
		});

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		return { success: true };
	} catch (error) {
		console.error("[actions/subscription] initiateSubscriptionPayment failed:", error);
		return { success: false, error: "Could not start the payment." };
	}
};

export { initiateSubscriptionPaymentAction };
