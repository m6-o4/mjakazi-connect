import type {
	CollectionAfterChangeHook,
	CollectionAfterDeleteHook,
	CollectionBeforeChangeHook,
} from "payload";
import { createClerkClient } from "@clerk/backend";
import type { User } from "@/payload-types";

const clerkClient = createClerkClient({
	publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
	secretKey: process.env.CLERK_SECRET_KEY,
});

// creates the clerk identity for payload-originated records. anything already
// carrying a clerkId came from clerk itself, via the webhook or the login
// strategy, so it passes through untouched. keying on clerkId rather than the
// context flag is what keeps first-login provisioning working
const createClerkUser: CollectionBeforeChangeHook<User> = async ({
	data,
	operation,
	req,
}) => {
	if (operation !== "create") return data;
	if (data.clerkId) return data;

	const password = (data as { password?: string }).password;

	if (!data.email) {
		throw new Error("Cannot create a Clerk user without an email address.");
	}

	if (!password) {
		throw new Error("A password is required when creating a user.");
	}

	try {
		const clerkUser = await clerkClient.users.createUser({
			emailAddress: [data.email],
			firstName: data.firstName || undefined,
			lastName: data.lastName || undefined,
			password,
			publicMetadata: { role: data.role ?? "user" },
		});

		data.clerkId = clerkUser.id;
	} catch (error) {
		req.payload.logger.error(`Clerk user creation failed: ${error}`);
		throw new Error("Could not create the user in Clerk. No Payload record was saved.");
	}

	// strip before persistence; the password lives in clerk, never in mongo
	delete (data as { password?: string }).password;

	return data;
};

// pushes name and role edits out to clerk. skips webhook-originated writes,
// which is the loop guard from task 2 doing its job
const syncClerkUser: CollectionAfterChangeHook<User> = async ({
	doc,
	operation,
	previousDoc,
	req,
}) => {
	if (operation !== "update") return doc;
	if (req.context.fromClerkWebhook) return doc;
	if (!doc.clerkId) return doc;

	const nameChanged =
		doc.firstName !== previousDoc.firstName || doc.lastName !== previousDoc.lastName;
	const roleChanged = doc.role !== previousDoc.role;

	// avoids a clerk round trip on edits that touch neither
	if (!nameChanged && !roleChanged) return doc;

	try {
		await clerkClient.users.updateUser(doc.clerkId, {
			firstName: doc.firstName || undefined,
			lastName: doc.lastName || undefined,
			publicMetadata: { role: doc.role ?? "user" },
		});
	} catch (error) {
		req.payload.logger.error(`Clerk user update failed: ${error}.`);
		throw new Error(
			"The Payload record was saved, but syncing to Clerk failed. The two are now out of step.",
		);
	}

	return doc;
};

// removes the clerk identity. without this a deleted payload record leaves a
// live clerk account behind, and the login strategy would simply re-provision
// the record on that user's next sign-in
const deleteClerkUser: CollectionAfterDeleteHook<User> = async ({ doc, req }) => {
	if (req.context.fromClerkWebhook) return doc;
	if (!doc.clerkId) return doc;

	try {
		await clerkClient.users.deleteUser(doc.clerkId);
	} catch (error) {
		req.payload.logger.error(`Clerk user deletion failed: ${error}`);
		throw new Error(
			"The Payload record was deleted, but removing the user from Clerk failed. They can still sign in.",
		);
	}

	return doc;
};

export { createClerkUser, deleteClerkUser, syncClerkUser };
