import { writeAuditLog } from "@/lib/audit";
import type { Payload } from "payload";

type ClerkRole = "mjakazi" | "mwajiri" | "admin" | "sa";

type VerificationState =
	| "draft"
	| "pending_payment"
	| "pending_review"
	| "verified"
	| "rejected"
	| "verification_expired"
	| "blacklisted"
	| "deactivated";

interface ClerkUser {
	id: string;
	email_addresses: { email_address: string }[];
	first_name?: string;
	last_name?: string;
	public_metadata?: { role?: ClerkRole };
	unsafe_metadata?: { role?: ClerkRole };
}

interface IdentityContext {
	accountId: string;
	role: "mjakazi" | "mwajiri" | "admin" | "sa";
	verificationStatus?: VerificationState;
	subscriptionStatus?: string;
	wajakaziProfileId?: string;
	waajiriProfileId?: string;
}

// builds a lightweight identity context for the authenticated user so request
// handlers can check role and profile ids without repeating the same db lookups
const resolveIdentity = async (
	payload: Payload,
	clerkId: string,
): Promise<IdentityContext | null> => {
	const accountQuery = await payload.find({
		collection: "accounts",
		where: { clerkId: { equals: clerkId } },
		limit: 1,
	});

	if (accountQuery.docs.length === 0) return null;

	const account = accountQuery.docs[0];

	const identity: IdentityContext = {
		accountId: account.id,
		role: account.role,
	};

	if (account.role === "mjakazi") {
		const profile = await payload.find({
			collection: "wajakaziprofiles",
			where: { account: { equals: account.id } },
			limit: 1,
		});

		if (profile.docs.length > 0) {
			const workerProfile = profile.docs[0];
			identity.wajakaziProfileId = workerProfile.id;
			identity.verificationStatus = workerProfile.verificationStatus;
		}
	}

	if (account.role === "mwajiri") {
		const profile = await payload.find({
			collection: "waajiriprofiles",
			where: { account: { equals: account.id } },
			limit: 1,
		});

		if (profile.docs.length > 0) {
			identity.waajiriProfileId = profile.docs[0].id;
			// subscriptionStatus drives dashboard gating without a subscriptions query
			identity.subscriptionStatus = profile.docs[0].subscriptionStatus ?? "none";
		}
	}

	return identity;
};

const PRIVILEGED_ROLES: ClerkRole[] = ["admin", "sa"];

// when a user's role changes the old profile type becomes stale — remove it
// so queries against the previous collection don't return ghost records
const cleanupOrphanedProfile = async (
	payload: Payload,
	accountId: string,
	orphanedRole: ClerkRole,
) => {
	if (orphanedRole === "mjakazi") {
		const orphaned = await payload.find({
			collection: "wajakaziprofiles",
			where: { account: { equals: accountId } },
			overrideAccess: true,
			limit: 1,
		});

		if (orphaned.docs.length > 0) {
			await payload.delete({
				collection: "wajakaziprofiles",
				id: orphaned.docs[0].id,
				overrideAccess: true,
			});
		}
	}

	if (orphanedRole === "mwajiri") {
		const orphaned = await payload.find({
			collection: "waajiriprofiles",
			where: { account: { equals: accountId } },
			overrideAccess: true,
			limit: 1,
		});

		if (orphaned.docs.length > 0) {
			await payload.delete({
				collection: "waajiriprofiles",
				id: orphaned.docs[0].id,
				overrideAccess: true,
			});
		}
	}
};

// canonical handler for Clerk's user.created and user.updated webhooks —
// upserts the Payload account record and keeps the domain profile in sync
const syncClerkUser = async (payload: Payload, user: ClerkUser) => {
	const clerkId = user.id;
	const email = user.email_addresses?.[0]?.email_address ?? null;
	const firstName = user.first_name ?? "";
	const lastName = user.last_name ?? "";

	const roleFromPublic = user.public_metadata?.role as ClerkRole | undefined;
	const roleFromUnsafe = user.unsafe_metadata?.role as ClerkRole | undefined;

	// unsafe_metadata is client-writable, so a privileged role there without
	// a matching public_metadata value signals a self-escalation attempt
	if (roleFromUnsafe && PRIVILEGED_ROLES.includes(roleFromUnsafe) && !roleFromPublic) {
		console.error("Privilege escalation attempt blocked:", { clerkId, roleFromUnsafe });
		throw new Error("Invalid Clerk user payload.");
	}

	const role = roleFromPublic ?? roleFromUnsafe ?? null;

	if (!email || !role) {
		console.error("Missing email or role in Clerk payload:", {
			clerkId,
			email,
			role,
			publicMetadata: user.public_metadata,
			unsafeMetadata: user.unsafe_metadata,
		});
		throw new Error("Invalid Clerk user payload.");
	}

	const existingQuery = await payload.find({
		collection: "accounts",
		where: { clerkId: { equals: clerkId } },
		overrideAccess: true,
		limit: 1,
	});

	const existingAccount = existingQuery.docs[0] ?? null;
	const previousRole = existingAccount?.role ?? null;

	// determines whether to emit account_created or account_updated in the audit log
	const isNewAccount = !existingAccount;

	let account;

	try {
		// attempt create first — falls through to update if the record already exists
		account = await payload.create({
			collection: "accounts",
			data: { clerkId, email, firstName, lastName, role },
		});
	} catch (error: any) {
		if (!existingAccount) throw error;

		account = await payload.update({
			collection: "accounts",
			id: existingAccount.id,
			data: { email, firstName, lastName, role },
		});
	}

	const actorLabel = [firstName, lastName].filter(Boolean).join(" ").trim() || email;

	await writeAuditLog({
		action: isNewAccount ? "account_created" : "account_updated",
		actorId: account.id,
		actorLabel,
		targetId: account.id,
		targetLabel: actorLabel,
		metadata: { role, email },
		source: "system",
	});

	// clean up the old profile type when the role has changed
	if (previousRole && previousRole !== role) {
		await cleanupOrphanedProfile(payload, account.id, previousRole);
	}

	await ensureDomainProfile(payload, account.id, role, firstName, lastName);
};

// idempotent — only creates a domain profile if one does not already exist,
// preventing duplicate records on repeated webhook deliveries
const ensureDomainProfile = async (
	payload: Payload,
	accountId: string,
	role: ClerkRole,
	firstName?: string,
	lastName?: string,
) => {
	const derivedName = [firstName, lastName].filter(Boolean).join(" ");

	if (role === "mjakazi") {
		const existing = await payload.find({
			collection: "wajakaziprofiles",
			where: { account: { equals: accountId } },
			overrideAccess: true,
			limit: 1,
		});

		if (existing.docs.length > 0) return;

		try {
			await payload.create({
				collection: "wajakaziprofiles",
				draft: false,
				data: {
					account: accountId,
					displayName: derivedName || "New Worker",
					verificationStatus: "draft",
					availabilityStatus: "available",
				},
			});
		} catch (error: any) {
			// ignore duplicate key errors — a concurrent webhook delivery may
			// have already created the profile
			if (!error?.message?.includes("duplicate")) throw error;
		}
	}

	if (role === "mwajiri") {
		const existing = await payload.find({
			collection: "waajiriprofiles",
			where: { account: { equals: accountId } },
			overrideAccess: true,
			limit: 1,
		});

		if (existing.docs.length > 0) return;

		try {
			await payload.create({
				collection: "waajiriprofiles",
				draft: false,
				data: {
					account: accountId,
					displayName: derivedName || "New Employer",
					moderationStatus: "active",
				},
			});
		} catch (error: any) {
			if (!error?.message?.includes("duplicate")) throw error;
		}
	}
};

// triggered by Clerk's user.deleted webhook — removes the Payload account record
// and writes the audit entry before deletion since the label data is lost afterwards
const deleteClerkUser = async (payload: Payload, clerkId: string) => {
	const existing = await payload.find({
		collection: "accounts",
		where: { clerkId: { equals: clerkId } },
		limit: 1,
	});

	if (existing.docs.length === 0) return;

	const account = existing.docs[0];
	const actorLabel =
		[account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
		account.email;

	// write before deleting — once the record is gone the label data is lost
	await writeAuditLog({
		action: "account_deleted",
		actorId: account.id,
		actorLabel,
		targetId: account.id,
		targetLabel: actorLabel,
		metadata: { role: account.role, email: account.email },
		source: "system",
	});

	await payload.delete({
		collection: "accounts",
		id: account.id,
	});
};

export { deleteClerkUser, resolveIdentity, syncClerkUser };
