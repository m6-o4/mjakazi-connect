import { getPayload, type TaskConfig } from "payload";

import config from "@/payload-config";
import { expireExpiredVerifications } from "@/services/verification.service";

// polled by the payload job queue daily (jobs.autoRun). transitions verified
// profiles past their verificationExpiry to verification_expired, which hides them
// from the directory (the guard requires `verified`) and emails the worker. the
// transition, audit entry and email live in the verification service — the handler
// only resolves payload and delegates.
const verificationExpiryTask: TaskConfig<any> = {
	slug: "verification-expiry",
	label: "Verification Expiry",
	schedule: [{ cron: "0 0 * * *", queue: "default" }],
	handler: async () => {
		const payload = await getPayload({ config });
		const { expired } = await expireExpiredVerifications(payload);
		return { output: { expired } };
	},
};

export { verificationExpiryTask };
