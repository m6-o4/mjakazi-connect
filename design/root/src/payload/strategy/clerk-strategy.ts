import { AuthStrategy } from "payload";

import type { User } from "@/payload-types";

import { createClerkClient } from "@clerk/backend";

type Role = NonNullable<User["role"]>;

// the complete set of roles. there is no neutral or default role in this
// project, so an unrecognised value is treated as no role at all rather than
// being coerced into one
const VALID_ROLES: readonly Role[] = ["admin", "staff", "mwajiri", "mjakazi"];

const isValidRole = (value: unknown): value is Role =>
	typeof value === "string" && VALID_ROLES.includes(value as Role);

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

			const createdUser = await payload.create({
				collection: "users",
				data: {
					clerkId: clerkUserId,
					email,
					firstName: clerkUser.firstName || "",
					lastName: clerkUser.lastName || "",
					role,
				},
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
