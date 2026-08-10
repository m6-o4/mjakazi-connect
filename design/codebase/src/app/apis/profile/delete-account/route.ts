import { writeAuditLog } from "@/lib/audit";
import { resolveIdentity } from "@/services/identity.service";
import { auth, clerkClient } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

const DELETE = async () => {
	// only authenticated users may delete their own account
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await getPayload({ config });

	// fetch the unified identity so we know the role and linked profile ids
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found" }, { status: 404 });
	}

	// only end-user roles can self-delete; admin and other roles are excluded
	if (identity.role !== "mjakazi" && identity.role !== "mwajiri") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	try {
		// resolve the account record upfront so we have a human-readable label
		// for audit logs even after the records are deleted
		const accountQuery = await payload.find({
			collection: "accounts",
			where: { clerkId: { equals: userId } },
			overrideAccess: true,
			limit: 1,
		});

		const account = accountQuery.docs[0] ?? null;
		const actorLabel = account
			? [account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
				account.email
			: userId;

		// --- mjakazi cleanup ---
		if (identity.role === "mjakazi" && identity.wajakaziProfileId) {
			// remove all vault documents belonging to this profile before deleting the profile itself
			const vaultDocs = await payload.find({
				collection: "vault",
				where: { profile: { equals: identity.wajakaziProfileId } },
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

			// fetch the profile to check for an associated photo before deleting it
			const profileDoc = await payload.findByID({
				collection: "wajakaziprofiles",
				id: identity.wajakaziProfileId,
				overrideAccess: true,
			});

			// delete the profile photo from media storage to avoid orphaned files
			if (profileDoc?.photo) {
				const photoId =
					typeof profileDoc.photo === "object" ? profileDoc.photo.id : profileDoc.photo;

				await payload.delete({
					collection: "media",
					id: photoId,
					overrideAccess: true,
				});
			}

			await payload.delete({
				collection: "wajakaziprofiles",
				id: identity.wajakaziProfileId,
				overrideAccess: true,
			});
		}

		// --- mwajiri cleanup ---
		if (identity.role === "mwajiri" && identity.waajiriProfileId) {
			await payload.delete({
				collection: "waajiriprofiles",
				id: identity.waajiriProfileId,
				overrideAccess: true,
			});
		}

		// audit log is written before the Clerk deletion so the actor id is still
		// resolvable; the subsequent Clerk webhook (deleteClerkUser) writes its own
		// system entry, mirroring the two-entry pattern used for staff-initiated deletions
		await writeAuditLog({
			action: "account_deleted",
			actorId: identity.accountId,
			actorLabel,
			targetId: identity.accountId,
			targetLabel: actorLabel,
			metadata: {
				role: identity.role,
				email: account?.email ?? null,
				selfDeleted: true,
			},
			source: "user",
		});

		// deleting the Clerk user triggers the webhook that removes the Payload account record
		const client = await clerkClient();
		await client.users.deleteUser(userId);

		return NextResponse.json({ success: true });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
};

export { DELETE };
