# Solution

The current implementation of the Clerk webhook endpoint uses a single environment
variable `CLERK_WEBHOOK_SIGNING_SECRET` to verify webhook signatures. This approach is not
suitable for handling both development and production environments, as each environment
has its own unique webhook signing secret.

To address this issue, we will create a new API endpoint that will handle both development
and production webhooks. The endpoint will use the `host` header to determine which
webhook signing secret to use.

### Webhook Endpoint

The new webhook endpoint will be located at `src/app/api/webhooks/clerk/route.ts`. The
endpoint will be responsible for the following:

- Verifying the webhook signature using the appropriate signing secret.
- Processing the webhook event.

The endpoint will use the `host` header to determine which signing secret to use. If the
`host` header contains the string `ngrok-free.dev`, the endpoint will use the development
signing secret. Otherwise, the endpoint will use the production signing secret.

The following code demonstrates how the endpoint will work:

```ts
import { NextResponse } from "next/server";
import { Webhook } from "svix";

const WEBHOOK_SIGNING_SECRET_DEV = process.env.CLERK_WEBHOOK_SIGNING_SECRET_DEV as string;
const WEBHOOK_SIGNING_SECRET_PRD = process.env.CLERK_WEBHOOK_SIGNING_SECRET_PRD as string;

const POST = async (req: Request) => {
	const host = req.headers.get("host");

	const WEBHOOK_SIGNING_SECRET = host?.includes("ngrok-free.dev")
		? WEBHOOK_SIGNING_SECRET_DEV
		: WEBHOOK_SIGNING_SECRET_PRD;

	// ...
};

export { POST };
```

### Environment Variables

The following environment variables will need to be added to the `.env` file:

- `CLERK_WEBHOOK_SIGNING_SECRET_DEV`: The webhook signing secret for the development
  environment.
- `CLERK_WEBHOOK_SIGNING_SECRET_PRD`: The webhook signing secret for the production
  environment.

The `.env.example` file will also need to be updated to include these new environment
variables.

### Webhook URLs

The webhook URLs in Clerk will need to be updated to point to the new endpoint. The
development webhook URL should be updated to point to the ngrok URL, and the production
webhook URL should be updated to point to the production URL.
