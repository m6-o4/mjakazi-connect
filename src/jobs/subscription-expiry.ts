import { getPayload, type TaskConfig } from "payload";

import config from "@/payload-config";
import { expireExpiredSubscriptions } from "@/services/subscription.service";

// polled by the payload job queue hourly (jobs.autoRun). transitions active
// subscriptions past their tierExpiry to expired, which blocks new reveals
// (phase 6.4) while leaving existing unlocks intact. the transition and audit
// entry live in the subscription service — the handler only resolves payload
// and delegates.
const subscriptionExpiryTask: TaskConfig<any> = {
	slug: "subscription-expiry",
	label: "Subscription Expiry",
	schedule: [{ cron: "0 * * * *", queue: "default" }],
	handler: async () => {
		const payload = await getPayload({ config });
		const { expired } = await expireExpiredSubscriptions(payload);
		return { output: { expired } };
	},
};

export { subscriptionExpiryTask };
