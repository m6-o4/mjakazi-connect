import { getPayload, type TaskConfig } from "payload";

import config from "@/payload-config";
import { expireStaleInvites } from "@/services/referral.service";

// polled by the payload job queue daily (jobs.autoRun). transitions unanswered
// (invited) referrals past their invite expiry to expired, freeing the pair so
// the employer can be invited again after the cooldown. the transition and audit
// entry live in the referral service — the handler only resolves payload and
// delegates.
const referralExpiryTask: TaskConfig<{ input: object; output: { expired: number } }> = {
	slug: "referral-expiry",
	label: "Referral Expiry",
	schedule: [{ cron: "0 0 * * *", queue: "default" }],
	handler: async () => {
		const payload = await getPayload({ config });
		const { expired } = await expireStaleInvites(payload);
		return { output: { expired } };
	},
};

export { referralExpiryTask };
