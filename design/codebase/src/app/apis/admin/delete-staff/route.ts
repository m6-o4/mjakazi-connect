import { writeAuditLog } from "@/lib/audit";
import { resolveIdentity } from "@/services/identity.service";
import { auth, clerkClient } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// removes a staff (admin) account from Clerk — restricted to sa-role users only.
// deleting from Clerk triggers the user.deleted webhook which removes the
// matching Payload account record via deleteClerkUser
const DELETE = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found" }, { status: 404 });
	}

	// only super-admins may delete staff accounts
	if (identity.role !== "sa") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await req.json();
	const { clerkId } = body;

	if (!clerkId) {
		return NextResponse.json({ error: "clerkId is required" }, { status: 400 });
	}

	// prevent an sa from accidentally deleting their own account
	if (clerkId === userId) {
		return NextResponse.json(
			{ error: "You cannot delete your own account." },
			{ status: 400 },
		);
	}

	try {
		// resolve the target account before deleting so we can label the entry
		const targetQuery = await payload.find({
			collection: "accounts",
			where: { clerkId: { equals: clerkId } },
			overrideAccess: true,
			limit: 1,
		});

		const targetAccount = targetQuery.docs[0] ?? null;
		const targetLabel = targetAccount
			? [targetAccount.firstName, targetAccount.lastName]
					.filter(Boolean)
					.join(" ")
					.trim() || targetAccount.email
			: clerkId;

		// resolve the sa's account for the actor label
		const saQuery = await payload.find({
			collection: "accounts",
			where: { clerkId: { equals: userId } },
			overrideAccess: true,
			limit: 1,
		});

		const sa = saQuery.docs[0] ?? null;
		const saLabel = sa
			? [sa.firstName, sa.lastName].filter(Boolean).join(" ").trim() || sa.email
			: userId;

		// log before the Clerk delete — the webhook will also fire deleteClerkUser
		// which writes its own entry; deletedByStaff distinguishes the two
		await writeAuditLog({
			action: "account_deleted",
			actorId: sa?.id ?? null,
			actorLabel: saLabel,
			targetId: targetAccount?.id ?? null,
			targetLabel,
			metadata: {
				role: targetAccount?.role ?? "admin",
				email: targetAccount?.email ?? null,
				deletedByStaff: true,
			},
			source: "user",
		});

		const client = await clerkClient();
		await client.users.deleteUser(clerkId);

		return NextResponse.json({ success: true });
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.errors?.[0]?.message ?? error.message },
			{ status: 400 },
		);
	}
};

export { DELETE };
