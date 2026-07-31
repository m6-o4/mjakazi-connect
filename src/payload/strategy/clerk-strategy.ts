import { AuthStrategy } from "payload";
import { createClerkClient } from "@clerk/backend";

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
			const requestState = await clerkClient.authenticateRequest(req, {
				authorizedParties: [process.env.NEXT_PUBLIC_SERVER_URL!],
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
			const role = (clerkUser.publicMetadata?.role as string) || "user";

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
					role: role as "admin" | "editor" | "user",
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
