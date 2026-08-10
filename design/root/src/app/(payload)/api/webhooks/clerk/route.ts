import { NextRequest } from "next/server";
import { getPayload } from "payload";

import type { User } from "@/payload-types";

import configPromise from "@/payload-config";
import { clerkWebhookContext } from "@/payload/utilities/request-context";

import { verifyWebhook } from "@clerk/nextjs/webhooks";

type Role = NonNullable<User["role"]>;

// the complete set of roles. there is no neutral or default role in this
// project, so an unrecognised value is treated as no role at all
const VALID_ROLES: readonly Role[] = ["admin", "staff", "mwajiri", "mjakazi"];

const isValidRole = (value: unknown): value is Role =>
	typeof value === "string" && VALID_ROLES.includes(value as Role);

// SEQUENCING NOTE
//
// Clerk fires user.created the moment a self-registering user completes sign-up,
// which is BEFORE /post-auth has promoted their chosen role into publicMetadata.
// That event therefore carries no role and is intentionally skipped here.
//
// The record is created shortly afterwards by one of two paths, whichever wins:
//   1. /post-auth calls updateUserMetadata, which fires user.updated with the
//      role present, and the branch below creates the record; or
//   2. the Clerk auth strategy provisions it inline on the user's next request.
//
// Both are idempotent and key on clerkId, so a race between them is harmless.
// Users created from the Payload panel already carry a role, since the
// createClerkUser hook writes publicMetadata at creation time.
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

		// a retry cannot fix a missing email, so this returns 200 rather than
		// generating alert noise from a permanent condition
		if (!primaryEmail) {
			console.error(
				`Clerk Webhook Error: user ${id} has no resolvable email, skipping sync.`,
			);
			return new Response("No resolvable email, skipped.", { status: 200 });
		}

		const role = public_metadata?.role;
		const existingUsers = await payload.find({
			collection: "users",
			where: { clerkId: { equals: id } },
		});

		const existingUser = existingUsers.docs[0];

		// no valid role and no existing record: the user has not been through
		// /post-auth yet. skip rather than defaulting — see the sequencing note.
		// 200 so Clerk does not retry a condition that will resolve on its own
		if (!isValidRole(role) && !existingUser) {
			return new Response("Role not yet assigned, skipped.", { status: 200 });
		}

		if (existingUser) {
			await payload.update({
				collection: "users",
				context: clerkWebhookContext,
				id: existingUser.id,
				data: {
					email: primaryEmail,
					firstName: first_name || "",
					lastName: last_name || "",
					// only overwrite the stored role when Clerk carries a valid one.
					// Payload is authoritative for role, so an empty or unrecognised
					// metadata value must never clear a role that is already set
					...(isValidRole(role) ? { role } : {}),
				},
			});
		} else if (isValidRole(role)) {
			await payload.create({
				collection: "users",
				context: clerkWebhookContext,
				data: {
					clerkId: id,
					email: primaryEmail,
					firstName: first_name || "",
					lastName: last_name || "",
					role,
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
