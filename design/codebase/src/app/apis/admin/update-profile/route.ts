import { resolveIdentity } from "@/services/identity.service";
import { auth, clerkClient } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// allows admin and sa to update their own first and last name
// email changes are not permitted
const PATCH = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found." }, { status: 404 });
	}

	if (identity.role !== "admin" && identity.role !== "sa") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	const body = await req.json();
	const { firstName, lastName } = body;

	if (!firstName) {
		return NextResponse.json({ error: "First name is required." }, { status: 400 });
	}

	try {
		const client = await clerkClient();

		// update clerk — this fires user.updated webhook
		// which calls syncClerkUser and updates the accounts collection
		await client.users.updateUser(userId, {
			firstName: firstName.trim(),
			lastName: lastName?.trim() ?? "",
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.errors?.[0]?.message ?? error.message },
			{ status: 400 },
		);
	}
};

export { PATCH };
