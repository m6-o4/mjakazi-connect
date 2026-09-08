import { getPayload, type TaskConfig } from "payload";

import config from "@/payload-config";
import { expireUnansweredEois } from "@/services/eoi.service";

// polled by the payload job queue daily (jobs.autoRun). transitions unanswered
// (sent) expressions of interest past 7 days to expired, freeing the pair so the
// mwajiri may send a fresh batch. the transition and audit entry live in the eoi
// service — the handler only resolves payload and delegates.
const eoiExpireTask: TaskConfig<{ input: object; output: { expired: number } }> = {
	slug: "eoi-expire",
	label: "EOI Expire",
	schedule: [{ cron: "0 0 * * *", queue: "default" }],
	handler: async () => {
		const payload = await getPayload({ config });
		const { expired } = await expireUnansweredEois(payload);
		return { output: { expired } };
	},
};

export { eoiExpireTask };
