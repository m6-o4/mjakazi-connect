import { AuthStrategy, Payload, ValidationError } from "payload";

import { isValidRole, type Role } from "@/lib/roles";

import { createClerkClient } from "@clerk/backend";

// provisions the payload record for a clerk user, tolerating the race where a
// concurrent request (or the user.created webhook) creates the same record
// between the caller's lookup and this create. clerkId is unique, so the
// loser of that race sees it as a ValidationError rather than a real failure —
// re-fetch and return the winner's record instead of failing this login
const createOrFindUser = async (
	payload: Payload,
	params: { clerkId: string; email: string; firstName: string; lastName: string; role: Role },
) => {
	try {
		return await payload.create({
			collection: "users",
			data: {
				clerkId: params.clerkId,
				email: params.email,
				firstName: params.firstName,
				lastName: params.lastName,
				role: params.role,
				accountState: "active",
			},
		});
	} catch (error) {
		const isDuplicateClerkId =
			error instanceof ValidationError &&
			error.data?.errors?.some((fieldError) => fieldError.path === "clerkId");

		if (!isDuplicateClerkId) {
			throw error;
		}

		const racedUsers = await payload.find({
			collection: "users",
			where: { clerkId: { equals: params.clerkId } },
			limit: 1,
		});

		const racedUser = racedUsers.docs[0];

		if (!racedUser) {
			throw error;
		}

		return racedUser;
	}
};

const clerkClient = createClerkClient({
	secretKey: process.env.CLERK_SECRET_KEY,
	publishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
});

const clerkStrategy: AuthStrategy = {
	name: "clerk-strategy",
	authenticate: async ({ payload, headers }) => {
		try {
			// reconstruct a request object to validate request headers via clerk
			const req = new Request("http://localhost", { headers });
			const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL!;
			const authorizedParties = [serverUrl];

			// allow the bare/www variant of the configured host, since Traefik
			// routes both to this app (see docker-compose.yml)
			try {
				const url = new URL(serverUrl);
				const altHost = url.hostname.startsWith("www.")
					? url.hostname.slice(4)
					: `www.${url.hostname}`;
				authorizedParties.push(`${url.protocol}//${altHost}`);
			} catch {
				// serverUrl not a valid URL; skip alt-host handling
			}

			const requestState = await clerkClient.authenticateRequest(req, {
				authorizedParties,
			});

			if (!requestState.isAuthenticated) {
				return { user: null };
			}

			const clerkUserId = requestState.toAuth().userId;

			// find the corresponding user record in payload's database
			const foundUsers = await payload.find({
				collection: "users",
				where: { clerkId: { equals: clerkUserId } },
				limit: 1,
			});

			if (foundUsers.docs.length > 0) {
				const user = foundUsers.docs[0];
				return { user: { ...user, collection: "users" } };
			}

			// no matching payload record yet — the user.created webhook likely
			// hasn't landed. provision the record now rather than blocking the
			// user on payload's blank login page (disableLocalStrategy leaves
			// no fallback UI).
			const clerkUser = await clerkClient.users.getUser(clerkUserId);
			const role = clerkUser.publicMetadata?.role;

			// no role means the user signed up but has not passed through
			// /post-auth yet, or the promotion failed. do NOT invent one: there is
			// no neutral role here, and defaulting would silently misfile them and
			// then lock that choice in, since role is admin-only after creation.
			// returning null sends them back through /post-auth, which re-prompts
			if (!isValidRole(role)) {
				payload.logger.warn(
					`Clerk Strategy: user ${clerkUserId} has no valid role in publicMetadata, provisioning skipped.`,
				);

				return { user: null };
			}

			const email = clerkUser.emailAddresses.find(
				(e) => e.id === clerkUser.primaryEmailAddressId,
			)?.emailAddress;

			if (!email) {
				payload.logger.error(
					`Clerk Strategy Error: User ${clerkUserId} has no resolvable primary email.`,
				);

				return { user: null };
			}

			const createdUser = await createOrFindUser(payload, {
				clerkId: clerkUserId,
				email,
				firstName: clerkUser.firstName || "",
				lastName: clerkUser.lastName || "",
				role,
			});

			return {
				user: { ...createdUser, collection: "users" },
			};
		} catch (error) {
			payload.logger.error(`Clerk Strategy Error: ${error}.`);
			return { user: null };
		}
	},
};

export { clerkStrategy };
