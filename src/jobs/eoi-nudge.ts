import { getPayload, type TaskConfig } from "payload";

import config from "@/payload-config";
import { sendAcceptedEoiNudges } from "@/services/eoi.service";

// polled by the payload job queue daily (jobs.autoRun). emails both parties of an
// accepted expression of interest at 3 and 5 days after acceptance, asking whether
// it resulted in a hire — two nudges, then silence. the nudge, CAS and email live
// in the eoi service — the handler only resolves payload and delegates. 8am so the
// ask lands in the morning rather than at midnight.
const eoiNudgeTask: TaskConfig<{ input: object; output: { nudged: number } }> = {
	slug: "eoi-nudge",
	label: "EOI Nudge",
	schedule: [{ cron: "0 8 * * *", queue: "default" }],
	handler: async () => {
		const payload = await getPayload({ config });
		const { nudged } = await sendAcceptedEoiNudges(payload);
		return { output: { nudged } };
	},
};

export { eoiNudgeTask };
