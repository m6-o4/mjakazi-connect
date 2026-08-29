import { redirect } from "next/navigation";
import type { Payload } from "payload";
import { getPayload } from "payload";

import type { User } from "@/payload-types";

import { DASHBOARD_BY_ROLE, isRegistrationRole, isValidRole, type Role } from "@/lib/roles";
import configPromise from "@/payload-config";
import { ensureProfile } from "@/services/identity.service";

import { createClerkClient } from "@clerk/backend";
import { auth } from "@clerk/nextjs/server";

const clerkClient = createClerkClient({
	publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
	secretKey: process.env.CLERK_SECRET_KEY,
});

// the user.updated webhook fires asynchronously after updateUserMetadata, so the
// payload record may not exist yet. poll briefly before dispatching
const findUserWithRetry = async (
	payload: Payload,
	clerkId: string,
	retries = 5,
): Promise<User | null> => {
	for (let attempt = 0; attempt < retries; attempt++) {
		const result = await payload.find({
			collection: "users",
			where: { clerkId: { equals: clerkId } },
			limit: 1,
		});

		const user = result.docs[0];
		if (user) return user;

		await new Promise((resolve) => setTimeout(resolve, 300));
	}

	return null;
};

const GET = async () => {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	let clerkUser;
	try {
		clerkUser = await clerkClient.users.getUser(userId);
	} catch (error) {
		console.error("[post-auth] failed to load Clerk user:", error);
		redirect("/registration");
	}

	const existingRole = clerkUser.publicMetadata?.role;
	const intendedRole = clerkUser.unsafeMetadata?.role;

	let role: Role;

	if (isValidRole(existingRole)) {
		// a real role is already set — admin/staff created in the panel, or a
		// returning user. never overwrite it from client-writable metadata
		role = existingRole;
	} else if (isRegistrationRole(intendedRole)) {
		// promote the declared intent to a real role and clear the intent
		try {
			await clerkClient.users.updateUserMetadata(userId, {
				publicMetadata: { role: intendedRole },
				unsafeMetadata: { role: null },
			});
		} catch (error) {
			console.error("[post-auth] failed to promote role:", error);
			redirect("/registration");
		}

		role = intendedRole;
	} else {
		// no resolvable role — re-prompt. never guess, never dead-end
		redirect("/registration");
	}

	// resolve the payload record, tolerating webhook lag. best-effort: if it has
	// not landed yet, the auth strategy provisions it on the next request
	try {
		const payload = await getPayload({ config: configPromise });
		const resolvedUser = await findUserWithRetry(payload, userId);

		if (resolvedUser) {
			await ensureProfile(payload, resolvedUser);
		}
	} catch (error) {
		console.error("[post-auth] failed to resolve Payload user:", error);
	}

	redirect(DASHBOARD_BY_ROLE[role]);
};

export { GET };
