import { getPayload, type TaskConfig } from "payload";

import config from "@/payload-config";
import { expireTimedOutPayments } from "@/services/payment.service";

// polled by the payload job queue every minute (jobs.autoRun). expires stk_sent
// payments that passed the confirmation window without a callback. the transition
// and audit entry live in the payment service — the handler only resolves payload
// and delegates.
const paymentTimeoutTask: TaskConfig<any> = {
	slug: "payment-timeout",
	label: "Payment Timeout",
	schedule: [{ cron: "* * * * *", queue: "default" }],
	handler: async () => {
		const payload = await getPayload({ config });
		const { expired } = await expireTimedOutPayments(payload);
		return { output: { expired } };
	},
};

export { paymentTimeoutTask };
