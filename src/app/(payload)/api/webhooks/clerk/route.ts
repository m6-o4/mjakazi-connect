import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextRequest } from "next/server";
import { getPayload } from "payload";
import configPromise from "@/payload-config";
import { clerkWebhookContext } from "@/payload/utilities/request-context";

export async function POST(req: NextRequest) {
	let evt;

	try {
		evt = await verifyWebhook(req);
	} catch (err) {
		console.error("Error verifying webhook:", err);
		return new Response("Verification failed", { status: 400 });
	}

	const payload = await getPayload({ config: configPromise });
	const eventType = evt.type;

	if (eventType === "user.created" || eventType === "user.updated") {
		const { id, email_addresses, first_name, last_name, public_metadata } = evt.data;
		const primaryEmail =
			email_addresses.find((e) => e.id === evt.data.primary_email_address_id)
				?.email_address || email_addresses[0]?.email_address;

		if (!primaryEmail) {
			console.error(
				`Clerk Webhook Error: user ${id} has no resolvable email, skipping sync.`,
			);
			return new Response("No resolvable email, skipped.", { status: 200 });
		}

		const role = (public_metadata?.role as string) || "user";

		const existingUsers = await payload.find({
			collection: "users",
			where: { clerkId: { equals: id } },
		});

		if (existingUsers.docs.length > 0) {
			await payload.update({
				collection: "users",
				context: clerkWebhookContext,
				id: existingUsers.docs[0].id,
				data: {
					email: primaryEmail,
					firstName: first_name || "",
					lastName: last_name || "",
					role: role as "admin" | "editor" | "user",
				},
			});
		} else {
			await payload.create({
				collection: "users",
				context: clerkWebhookContext,
				data: {
					clerkId: id,
					email: primaryEmail,
					firstName: first_name || "",
					lastName: last_name || "",
					role: role as "admin" | "editor" | "user",
				},
			});
		}
	}

	if (eventType === "user.deleted") {
		const { id } = evt.data;
		if (id) {
			await payload.delete({
				collection: "users",
				context: clerkWebhookContext,
				where: { clerkId: { equals: id } },
			});
		}
	}

	return new Response("Webhook processed successfully.", { status: 200 });
}
