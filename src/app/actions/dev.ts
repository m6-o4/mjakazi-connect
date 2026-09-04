"use server";

import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import type { StkCallback } from "@/lib/mpesa";
import config from "@/payload-config";
import { handleCallback } from "@/services/payment.service";

type ActionResult = {
	success: boolean;
	error?: string;
	code?: string;
};

// development-only helper. the daraja sandbox accepts an stk push but never
// fires the confirmation callback, so the confirmed-payment path cannot be
// exercised end to end in development without feeding a callback back in. this
// does exactly that — it finds the caller's latest stk_sent payment and runs a
// correctly-shaped synthetic callback through the real handleCallback handler,
// so the same correlation checks, audit entries and activation transitions run
// as they would for a genuine callback. it never sets state directly, and it is
// inert when MPESA_ENVIRONMENT is production: the guard returns before any
// database access.
const simulatePaymentCallbackAction = async (): Promise<ActionResult> => {
	if (process.env.MPESA_ENVIRONMENT === "production") {
		return { success: false, error: "Not available in production." };
	}

	const user = await getCurrentUser();
	if (!user) return { success: false, error: "You must be signed in." };
	if (user.role !== "mjakazi" && user.role !== "mwajiri") {
		return { success: false, error: "Forbidden." };
	}

	const payload = await getPayload({ config });

	const result = await payload.find({
		collection: "payments",
		where: {
			and: [{ user: { equals: user.id } }, { status: { equals: "stk_sent" } }],
		},
		sort: "-createdAt",
		limit: 1,
		overrideAccess: true,
	});

	const payment = result.docs[0];
	if (
		!payment ||
		!payment.checkoutRequestId ||
		!payment.merchantRequestId ||
		!payment.phoneNumber
	) {
		return { success: false, error: "No pending payment found. Click Pay first." };
	}

	const callback: StkCallback = {
		Body: {
			stkCallback: {
				MerchantRequestID: payment.merchantRequestId,
				CheckoutRequestID: payment.checkoutRequestId,
				ResultCode: 0,
				ResultDesc: "The service request is processed successfully.",
				CallbackMetadata: {
					Item: [
						{ Name: "Amount", Value: payment.amount },
						{ Name: "MpesaReceiptNumber", Value: "TEST0001" },
						{ Name: "PhoneNumber", Value: payment.phoneNumber },
					],
				},
			},
		},
	};

	const outcome = await handleCallback(payload, callback);
	if (!outcome.success) {
		return { success: false, error: outcome.error, code: outcome.code };
	}

	return { success: true };
};

export { simulatePaymentCallbackAction };
