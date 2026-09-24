import type { Payload } from "payload";

import { toId } from "@/lib/payload-helpers";
import type { User, WajakaziProfile } from "@/payload-types";

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

// trusted read of a mjakazi profile. this service is the one place contact
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
		where: {
			and: [{ mwajiri: { equals: user.id } }, { mjakazi: { equals: mjakaziId } }],
		},
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

// the grant for a pair, if one exists. trusted read — the caller has already
// authorized, and only ever asks about one pair
const findGrant = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
): Promise<{ id: string } | null> => {
	try {
		const result = await payload.find({
			collection: "contact-unlocks",
			where: {
				and: [{ mwajiri: { equals: mwajiriId } }, { mjakazi: { equals: mjakaziId } }],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		return result.docs[0] ?? null;
	} catch {
		return null;
	}
};

// records the durable contact grant produced by an accepted expression of
// interest. the grant is permanent and holds the contact after the subscription
// expires, so this is the one path that now creates a grant.
//
// idempotent by design: an existing grant (including one created by the retired
// direct-reveal path) short-circuits, and a concurrent create that loses the
// compound unique index is treated as already granted. the caller needs the new
// row's id only so it can roll the grant back if the acceptance it belongs to
// loses its compare-and-swap race
const grantContactFromEoi = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
	eoiId: string,
): Promise<Result<{ grantId: string | null }>> => {
	const existing = await findGrant(payload, mwajiriId, mjakaziId);
	if (existing) return { success: true, data: { grantId: null } };

	try {
		const created = await payload.create({
			collection: "contact-unlocks",
			data: {
				mwajiri: mwajiriId,
				mjakazi: mjakaziId,
				source: "eoi",
				sourceEoi: eoiId,
				unlockedAt: new Date().toISOString(),
			},
			overrideAccess: true,
		});
		return { success: true, data: { grantId: created.id } };
	} catch (error) {
		console.error("[services/contact] grant create failed:", error);
		// the failure may be a concurrent create that won the unique index — re-read
		// before deciding whether the grant exists
		const raced = await findGrant(payload, mwajiriId, mjakaziId);
		if (raced) return { success: true, data: { grantId: null } };
		return fail("Could not grant this contact.");
	}
};

export { getContact, grantContactFromEoi, hasUnlock };
export type { Contact };
