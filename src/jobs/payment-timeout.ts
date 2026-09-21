import { getPayload, type TaskConfig } from "payload";

import config from "@/payload-config";
import { reconcileTimedOutPayments } from "@/services/payment.service";

type PaymentTimeoutOutput = {
	checked: number;
	paid: number;
	failed: number;
	unresolved: number;
};

// polled by the payload job queue every minute (jobs.autoRun). asks m-pesa what
// happened to pushes that passed the confirmation window without a callback, and
// marks failed only the ones m-pesa says did not complete. it never expires a
// payment on the clock: a paid customer whose confirmation was lost stays visible
// for staff instead of being written off. the work and its audit entries live in
// the payment service — the handler only resolves payload and delegates.
const paymentTimeoutTask: TaskConfig<{ input: object; output: PaymentTimeoutOutput }> = {
	slug: "payment-timeout",
	label: "Payment Timeout",
	schedule: [{ cron: "* * * * *", queue: "default" }],
	handler: async () => {
		const payload = await getPayload({ config });
		const output = await reconcileTimedOutPayments(payload);
		return { output };
	},
};

export { paymentTimeoutTask };
