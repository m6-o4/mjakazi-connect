import { retry } from "@/lib/retry";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

// handles role-based redirection after a successful authentication handshake
const GET = async () => {
	const { userId } = await auth();
	if (!userId) redirect("/");

	const payload = await getPayload({ config });

	// retries the identity resolution to account for eventual consistency in webhook synchronization
	const identity = await retry(() => resolveIdentity(payload, userId));

	if (!identity) redirect("/");

	switch (identity.role) {
		case "admin":
			redirect("/dashboard/admin");
		case "mjakazi":
			redirect("/dashboard/mjakazi");
		case "mwajiri":
			redirect("/dashboard/mwajiri");
		case "sa":
			redirect("/dashboard/sa");
		default:
			redirect("/");
	}
};

export { GET };
