import { writeAuditLog } from "@/lib/audit";
import { resolveIdentity } from "@/services/identity.service";
import { auth, clerkClient } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// removes a regular user account (mjakazi or mwajiri) — restricted to admin and sa roles.
// cascades through profile and vault records before hitting Clerk so no orphaned
// data remains after the webhook fires
const DELETE = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found." }, { status: 404 });
	}

	// staff accounts (admin / sa) are intentionally excluded — they must be
	// managed from the SA dashboard via delete-staff
	if (identity.role !== "admin" && identity.role !== "sa") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	const body = await req.json();
	const { clerkId, role } = body;

	if (!clerkId || !role) {
		return NextResponse.json(
			{ error: "clerkId and role are required." },
			{ status: 400 },
		);
	}

	// prevent staff from accidentally deleting their own account
	if (clerkId === userId) {
		return NextResponse.json(
			{ error: "You cannot delete your own account." },
			{ status: 400 },
		);
	}

	// guard against misrouted requests — only user-facing roles belong here
	if (role === "admin" || role === "sa") {
		return NextResponse.json(
			{ error: "Staff accounts must be managed from the SA dashboard." },
			{ status: 403 },
		);
	}

	try {
		const accountQuery = await payload.find({
			collection: "accounts",
			where: { clerkId: { equals: clerkId } },
			overrideAccess: true,
			limit: 1,
		});

		if (accountQuery.docs.length === 0) {
			return NextResponse.json({ error: "Account not found" }, { status: 404 });
		}

		const account = accountQuery.docs[0];

		// resolve actor label from the staff member performing the deletion
		const actorAccount = await payload.find({
			collection: "accounts",
			where: { clerkId: { equals: userId } },
			overrideAccess: true,
			limit: 1,
		});

		const actor = actorAccount.docs[0] ?? null;
		const actorLabel = actor
			? [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() || actor.email
			: userId;

		const targetLabel =
			[account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
			account.email;

		if (role === "mjakazi") {
			const profileQuery = await payload.find({
				collection: "wajakaziprofiles",
				where: { account: { equals: account.id } },
				overrideAccess: true,
				limit: 1,
			});

			if (profileQuery.docs.length > 0) {
				const profile = profileQuery.docs[0];

				// remove all vault documents linked to this profile
				const vaultDocs = await payload.find({
					collection: "vault",
					where: { profile: { equals: profile.id } },
					overrideAccess: true,
					limit: 100,
				});

				await Promise.all(
					vaultDocs.docs.map((doc) =>
						payload.delete({
							collection: "vault",
							id: doc.id,
							overrideAccess: true,
						}),
					),
				);

				// remove the profile photo from media storage before deleting the profile
				if (profile.photo) {
					const photoId =
						typeof profile.photo === "object" ? (profile.photo as any).id : profile.photo;

					await payload.delete({
						collection: "media",
						id: photoId,
						overrideAccess: true,
					});
				}

				await payload.delete({
					collection: "wajakaziprofiles",
					id: profile.id,
					overrideAccess: true,
				});
			}
		}

		if (role === "mwajiri") {
			const profileQuery = await payload.find({
				collection: "waajiriprofiles",
				where: { account: { equals: account.id } },
				overrideAccess: true,
				limit: 1,
			});

			if (profileQuery.docs.length > 0) {
				await payload.delete({
					collection: "waajiriprofiles",
					id: profileQuery.docs[0].id,
					overrideAccess: true,
				});
			}
		}

		// log the staff-initiated deletion before triggering the Clerk delete
		// the webhook will also fire deleteClerkUser which writes its own entry
		// metadata.deletedByStaff distinguishes the two in the audit log
		await writeAuditLog({
			action: "account_deleted",
			actorId: actor?.id ?? null,
			actorLabel,
			targetId: account.id,
			targetLabel,
			metadata: {
				role,
				email: account.email,
				deletedByStaff: true,
			},
			source: "user",
		});

		const client = await clerkClient();
		await client.users.deleteUser(clerkId);

		return NextResponse.json({ success: true });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
};

export { DELETE };
