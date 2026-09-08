import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import { toId, userLabel } from "@/lib/payload-helpers";
import { DIRECTORY_VISIBLE } from "@/payload/access/access-control";
import type { User, WajakaziProfile } from "@/payload-types";
import { getOwnSubscription } from "@/services/subscription.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

// the contact vault: phone (on the profile) + email (on the owner's user record).
// email is not a profile field, so both are read here, together, in the one
// service that is allowed to select them
type Contact = {
	phone: string | null;
	email: string;
};

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

// trusted read of a wajakazi profile. this service is the one place contact
// fields are read, so it reads through overrideAccess after authorizing in the
// caller — the exemptions to invariant #15 are named in architecture.md
const loadProfile = async (
	payload: Payload,
	profileId: string,
): Promise<WajakaziProfile | null> => {
	try {
		return await payload.findByID({
			collection: "wajakazi-profiles",
			id: profileId,
			depth: 0,
			overrideAccess: true,
		});
	} catch {
		return null;
	}
};

// resolves the mjakazi's email from the user record their profile points at.
// a mwajiri cannot read another user's email through access control, so this is
// a trusted read — and it is only ever reached after the unlock gate has passed
const loadOwnerEmail = async (
	payload: Payload,
	profile: WajakaziProfile,
): Promise<string | null> => {
	const userId = toId(profile.user);
	if (!userId) return null;

	try {
		const owner = await payload.findByID({
			collection: "users",
			id: userId,
			depth: 0,
			overrideAccess: true,
		});
		return owner?.email ?? null;
	} catch {
		return null;
	}
};

// whether the caller has already unlocked a given profile. cheap existence check
// used to seed the browse detail's contact area
const hasUnlock = async (
	payload: Payload,
	user: User,
	mjakaziId: string,
): Promise<boolean> => {
	if (user.role !== "mwajiri") return false;

	const result = await payload.find({
		collection: "contact-unlocks",
		where: { and: [{ mwajiri: { equals: user.id } }, { mjakazi: { equals: mjakaziId } }] },
		limit: 1,
		depth: 0,
		overrideAccess: false,
		req: { user },
	});

	return result.docs.length > 0;
};

// the contact for an already-unlocked profile, or null when the caller has not
// unlocked it (or it no longer exists). deliberately does not re-check directory
// visibility — an unlock is permanent and stays viewable after the profile goes
// hired / on a break / expired
const getContact = async (
	payload: Payload,
	user: User,
	mjakaziId: string,
): Promise<Contact | null> => {
	if (user.role !== "mwajiri") return null;
	if (!(await hasUnlock(payload, user, mjakaziId))) return null;

	const profile = await loadProfile(payload, mjakaziId);
	if (!profile) return null;

	const email = await loadOwnerEmail(payload, profile);
	if (!email) return null;

	return { phone: profile.phone ?? null, email };
};

// the reveal: records a permanent unlock, writes the audit entry, and returns the
// contact. the one operation the product exists to enable, and the only code that
// may select phone + email. gated on role + an active subscription, and re-checks
// that the target is still live in the directory (mirroring toggleSave). the
// compound unique index makes a concurrent double-reveal collapse into an
// idempotent "already unlocked" return rather than a duplicate grant
const revealContact = async (
	payload: Payload,
	user: User,
	mjakaziId: string,
): Promise<Result<Contact & { tierAtUnlock: string | null }>> => {
	if (user.role !== "mwajiri") return fail("Forbidden", "forbidden");

	const subscription = await getOwnSubscription(payload, user);
	if (!subscription || subscription.subscriptionState !== "active") {
		return fail(
			"An active subscription is required to unlock contact details.",
			"subscription_inactive",
		);
	}

	const visible = await payload.find({
		collection: "wajakazi-profiles",
		where: { and: [DIRECTORY_VISIBLE, { id: { equals: mjakaziId } }] },
		limit: 1,
		depth: 0,
		select: { slug: true },
		overrideAccess: false,
		req: { user },
	});
	if (visible.docs.length === 0) {
		return fail("This profile is no longer available.", "not_found");
	}

	const profile = await loadProfile(payload, mjakaziId);
	if (!profile) return fail("Profile not found.", "not_found");

	const email = await loadOwnerEmail(payload, profile);
	if (!email) return fail("This wajakazi has no email on file.", "missing_email");

	const contact: Contact = { phone: profile.phone ?? null, email };
	const tierAtUnlock = subscription.tierName ?? null;

	try {
		await payload.create({
			collection: "contact-unlocks",
			data: {
				mwajiri: user.id,
				mjakazi: mjakaziId,
				tierAtUnlock,
				unlockedAt: new Date().toISOString(),
				subscription: subscription.id,
			},
			overrideAccess: true,
		});
	} catch (error) {
		// the compound unique index rejects a concurrent double-reveal — treat it
		// as already unlocked and return the contact rather than surfacing a
		// spurious error or writing a second audit entry
		console.error("[services/contact] reveal create failed:", error);
		const existing = await getContact(payload, user, mjakaziId);
		if (existing) return { success: true, data: { ...existing, tierAtUnlock } };
		return fail("Could not unlock this contact.");
	}

	await writeAuditLog({
		action: "contact_unlocked",
		actorId: user.id,
		actorLabel: userLabel(user),
		targetId: toId(profile.user),
		metadata: {
			mjakaziId,
			tierAtUnlock,
			subscriptionId: subscription.id,
		},
		source: "user",
	});

	return { success: true, data: { ...contact, tierAtUnlock } };
};

export { getContact, hasUnlock, revealContact };
export type { Contact };
