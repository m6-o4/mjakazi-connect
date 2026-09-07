import type { Payload } from "payload";

// resolves a user's email + first name for a notification send. a trusted read:
// the email is used only as a send destination, never returned to the client.
// shared by every service that emails a user by id so the contract lives in one
// place (was previously duplicated as loadPayerEmail / loadWorkerEmail /
// loadUserEmail across three services)
const loadUserEmail = async (
	payload: Payload,
	userId: string,
): Promise<{ email: string; firstName: string } | null> => {
	try {
		const user = await payload.findByID({
			collection: "users",
			id: userId,
			depth: 0,
			overrideAccess: true,
		});
		if (!user?.email) return null;
		return { email: user.email, firstName: user.firstName ?? "there" };
	} catch {
		return null;
	}
};

export { loadUserEmail };
