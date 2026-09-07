import type { Payload } from "payload";

import type { User } from "@/payload-types";
import { DIRECTORY_VISIBLE } from "@/payload/access/access-control";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

// relationships come back as an id string at depth 0, or as an object when
// populated. normalized to an id here
const toId = (
	value: string | { id?: string | number } | null | undefined,
): string | null => {
	if (!value) return null;
	if (typeof value === "string") return value;
	return typeof value.id === "number" ? String(value.id) : (value.id ?? null);
};

// the mjakazi profile ids a mwajiri has saved, most recently saved first. read
// through access control so a mwajiri only ever sees their own shortlist
const listSavedProfileIds = async (payload: Payload, user: User): Promise<string[]> => {
	if (user.role !== "mwajiri") return [];

	const result = await payload.find({
		collection: "saved-wajakazi",
		where: { user: { equals: user.id } },
		limit: 500,
		depth: 0,
		sort: "-createdAt",
		select: { mjakazi: true },
		overrideAccess: false,
		req: { user },
	});

	return result.docs
		.map((row) => toId(row.mjakazi))
		.filter((id): id is string => id !== null);
};

// whether the caller has saved a given profile. cheap existence check used to
// seed the browse detail's toggle state
const isSaved = async (
	payload: Payload,
	user: User,
	mjakaziId: string,
): Promise<boolean> => {
	if (user.role !== "mwajiri") return false;

	const result = await payload.find({
		collection: "saved-wajakazi",
		where: { and: [{ user: { equals: user.id } }, { mjakazi: { equals: mjakaziId } }] },
		limit: 1,
		depth: 0,
		select: { mjakazi: true },
		overrideAccess: false,
		req: { user },
	});

	return result.docs.length > 0;
};

// saves or unsaves a profile for the caller, returning the new state. idempotent:
// a save of an already-saved profile and an unsave of a not-saved one are both
// no-ops (the latter simply deletes nothing)
const toggleSave = async (
	payload: Payload,
	user: User,
	mjakaziId: string,
): Promise<Result<{ saved: boolean }>> => {
	if (user.role !== "mwajiri") return fail("Forbidden", "forbidden");

	// only a live, directory-visible profile can be saved — this mirrors what the
	// mwajiri could actually have reached on the browse detail
	const profile = await payload.find({
		collection: "wajakazi-profiles",
		where: { and: [DIRECTORY_VISIBLE, { id: { equals: mjakaziId } }] },
		limit: 1,
		depth: 0,
		select: { slug: true },
		overrideAccess: false,
		req: { user },
	});
	if (profile.docs.length === 0) {
		return fail("This profile is no longer available.", "not_found");
	}

	const existing = await payload.find({
		collection: "saved-wajakazi",
		where: { and: [{ user: { equals: user.id } }, { mjakazi: { equals: mjakaziId } }] },
		limit: 1,
		depth: 0,
		select: { mjakazi: true },
		overrideAccess: false,
		req: { user },
	});

	if (existing.docs.length > 0) {
		await payload.delete({
			collection: "saved-wajakazi",
			id: existing.docs[0].id,
			overrideAccess: false,
			req: { user },
		});
		return { success: true, data: { saved: false } };
	}

	try {
		await payload.create({
			collection: "saved-wajakazi",
			data: { user: user.id, mjakazi: mjakaziId },
			overrideAccess: false,
			req: { user },
		});
		return { success: true, data: { saved: true } };
	} catch (error) {
		// the compound unique index can reject a concurrent double-save — treat it
		// as already saved rather than surfacing a spurious error
		console.error("[services/saved] save failed:", error);
		const stillSaved = await isSaved(payload, user, mjakaziId);
		if (stillSaved) return { success: true, data: { saved: true } };
		return fail("Could not save this wajakazi.");
	}
};

export { isSaved, listSavedProfileIds, toggleSave };
