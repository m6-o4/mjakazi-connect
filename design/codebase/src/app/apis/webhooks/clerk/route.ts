import { deleteClerkUser, syncClerkUser } from "@/services/identity.service";
import config from "@payload-config";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { Webhook } from "svix";

const WEBHOOK_SIGNING_SECRET = process.env.CLERK_WEBHOOK_SIGNING_SECRET as string;

// processes incoming webhooks from Clerk to synchronize user state
const POST = async (req: Request) => {
	const payloadBody = await req.text();
	const headerPayload = await headers();

	const svixId = headerPayload.get("svix-id") ?? "";
	const svixTimestamp = headerPayload.get("svix-timestamp") ?? "";
	const svixSignature = headerPayload.get("svix-signature") ?? "";

	if (!svixId || !svixTimestamp || !svixSignature) {
		return new NextResponse("Missing Svix headers", { status: 400 });
	}

	const wh = new Webhook(WEBHOOK_SIGNING_SECRET);

	let evt;

	try {
		// verifies the webhook signature to ensure request authenticity
		evt = wh.verify(payloadBody, {
			"svix-id": svixId,
			"svix-timestamp": svixTimestamp,
			"svix-signature": svixSignature,
		});
	} catch (err) {
		return new NextResponse("Webhook verification failed.", { status: 400 });
	}

	const { type, data } = evt as any;

	const payload = await getPayload({ config });

	try {
		switch (type) {
			case "user.created":
			case "user.updated":
				await syncClerkUser(payload, data);
				break;

			case "user.deleted":
				await deleteClerkUser(payload, data.id);
				break;
		}
	} catch (error: any) {
		console.error("Clerk Webhook Error:", error.message, error.stack);
		return new NextResponse(`Webhook processing error: ${error.message}`, {
			status: 500,
		});
	}

	return NextResponse.json({ received: true });
};

export { POST };
