import { Config } from "payload";

import { resendAdapter } from "@payloadcms/email-resend";

// retrieve values from the environment variables.
const resendFromEmail = process.env.RESEND_FROM_EMAIL!;
const resendFromName = process.env.RESEND_FROM_NAME!;
const resendApiKey = process.env.RESEND_API_KEY!;

const resend: Config["email"] = resendAdapter({
	defaultFromAddress: resendFromEmail,
	defaultFromName: resendFromName,
	apiKey: resendApiKey,
});

export { resend };
