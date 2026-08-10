import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// only these two roles are allowed to be self-assigned by users during onboarding
const VALID_PUBLIC_ROLES = ["mjakazi", "mwajiri"];

const POST = async (req: Request) => {
	const { userId } = await auth();

	// reject unauthenticated requests — a user must be signed in to claim a role
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const body = await req.json();
	const { role } = body;

	// guard against arbitrary role injection from the client
	if (!role || !VALID_PUBLIC_ROLES.includes(role)) {
		return NextResponse.json({ error: "Invalid role." }, { status: 400 });
	}

	try {
		const client = await clerkClient();

		const clerkUser = await client.users.getUser(userId);
		const existingRole = clerkUser.publicMetadata?.role;

		if (existingRole) {
			// role is already authoritative in publicMetadata — don't overwrite it,
			// but still clear any stale role value left in unsafeMetadata from sign-up
			await client.users.updateUserMetadata(userId, {
				unsafeMetadata: { role: null },
			});
			return NextResponse.json({ success: true, role: existingRole });
		}

		// promote the chosen role to publicMetadata (server-controlled, trusted)
		// and explicitly null out the unsafeMetadata role so it can't be reused —
		// passing an empty object would leave the key intact in Clerk
		await client.users.updateUserMetadata(userId, {
			publicMetadata: { role },
			unsafeMetadata: { role: null },
		});

		return NextResponse.json({ success: true, role });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
};

export { POST };
