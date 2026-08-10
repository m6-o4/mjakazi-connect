import { writeAuditLog } from "@/lib/audit";
import { resolveIdentity } from "@/services/identity.service";
import { auth, clerkClient } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// creates a new admin account in Clerk — restricted to sa-role users only
const POST = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found" }, { status: 404 });
	}

	// only super-admins may create staff accounts
	if (identity.role !== "sa") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await req.json();
	const { email, firstName, lastName } = body;

	if (!email || !firstName) {
		return NextResponse.json(
			{ error: "email and firstName are required" },
			{ status: 400 },
		);
	}

	try {
		const client = await clerkClient();

		// a random temporary password is required by Clerk's API but intentionally
		// unusable — the new admin should sign in via a password reset or magic link
		const newUser = await client.users.createUser({
			emailAddress: [email],
			firstName,
			lastName: lastName ?? "",
			password: `tmp-${crypto.randomUUID()}`,
			skipPasswordRequirement: true,
			legalAcceptedAt: new Date(),
			publicMetadata: { role: "admin" },
		});

		// resolve the sa's account record for a labelled actor entry
		const saAccount = await payload.find({
			collection: "accounts",
			where: { clerkId: { equals: userId } },
			overrideAccess: true,
			limit: 1,
		});

		const sa = saAccount.docs[0] ?? null;
		const saLabel = sa
			? [sa.firstName, sa.lastName].filter(Boolean).join(" ").trim() || sa.email
			: userId;

		const newStaffLabel = [firstName, lastName].filter(Boolean).join(" ").trim() || email;

		// the new admin's Payload account does not exist yet — it is created
		// when the user.created webhook fires. we log the intent here with the
		// sa as actor and the email as the target label
		await writeAuditLog({
			action: "account_created",
			actorId: sa?.id ?? null,
			actorLabel: saLabel,
			targetId: null,
			targetLabel: newStaffLabel,
			metadata: {
				role: "admin",
				email,
				clerkId: newUser.id,
				createdBySa: true,
			},
			source: "user",
		});

		return NextResponse.json({ success: true, clerkId: newUser.id });
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.errors?.[0]?.message ?? error.message },
			{ status: 400 },
		);
	}
};

export { POST };
