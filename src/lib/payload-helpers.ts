import type { Payload } from "payload";

import type { User } from "@/payload-types";

// relationships come back as an id string at depth 0, or as an object when
// populated. normalized to an id here
const toId = (
	value: string | { id?: string | number } | null | undefined,
): string | null => {
	if (!value) return null;
	if (typeof value === "string") return value;
	return typeof value.id === "number" ? String(value.id) : (value.id ?? null);
};

// the actor label is a name snapshot so the audit log stays readable after an
// account is renamed or deleted
const userLabel = (user: User): string => {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return name || user.email;
};

// trusted read of a user's full name, used to label a counterpart in an inbox or
// email. no contact field is returned
const loadUserName = async (payload: Payload, userId: string): Promise<string | null> => {
	try {
		const user = await payload.findByID({
			collection: "users",
			id: userId,
			depth: 0,
			overrideAccess: true,
		});
		const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
		return name || null;
	} catch {
		return null;
	}
};

// resolves the display name + location for a set of wajakazi profile ids. an
// explicit select — no contact or identity fields are ever read here
const loadProfileDisplay = async (
	payload: Payload,
	ids: string[],
): Promise<Map<string, { displayName: string | null; location: string | null }>> => {
	const map = new Map<string, { displayName: string | null; location: string | null }>();
	if (ids.length === 0) return map;

	const result = await payload.find({
		collection: "wajakazi-profiles",
		where: { id: { in: ids } },
		limit: ids.length,
		depth: 0,
		select: { displayName: true, location: true },
		overrideAccess: true,
	});

	for (const profile of result.docs) {
		map.set(String(profile.id), {
			displayName: profile.displayName ?? null,
			location: profile.location ?? null,
		});
	}

	return map;
};

// resolves the sender name + location for a set of mwajiri user ids. the name
// comes from the user record; the location from their waajiri profile
const loadSenderInfo = async (
	payload: Payload,
	userIds: string[],
): Promise<Map<string, { name: string; location: string | null }>> => {
	const map = new Map<string, { name: string; location: string | null }>();
	if (userIds.length === 0) return map;

	const users = await payload.find({
		collection: "users",
		where: { id: { in: userIds } },
		limit: userIds.length,
		depth: 0,
		select: { firstName: true, lastName: true },
		overrideAccess: true,
	});

	for (const user of users.docs) {
		const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
		map.set(String(user.id), { name, location: null });
	}

	const profiles = await payload.find({
		collection: "waajiri-profiles",
		where: { user: { in: userIds } },
		limit: userIds.length,
		depth: 0,
		select: { user: true, location: true },
		overrideAccess: true,
	});

	for (const profile of profiles.docs) {
		const userId = toId(profile.user);
		if (!userId) continue;
		const entry = map.get(userId);
		if (entry) entry.location = profile.location ?? null;
	}

	return map;
};

export { loadProfileDisplay, loadSenderInfo, loadUserName, toId, userLabel };
