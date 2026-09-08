import { randomBytes } from "node:crypto";
import type { CollectionBeforeChangeHook } from "payload";

import { formatSlug } from "@/payload/fields/slug/format-slug";

// builds a stable, unique slug from a profile's public display name. a random
// suffix guarantees uniqueness even when display names collide (two "mary"s) —
// the slug is the permanent public URL, so it can never be derived from the
// display name alone
const generateProfileSlug = (name: string): string => {
	const base = formatSlug(name) ?? "wajakazi";
	return `${base}-${randomBytes(3).toString("hex")}`;
};

// set-once: assigns a slug when the document has none yet (a fresh create, or
// an update backfilling a profile that predates the field). it never
// regenerates, so editing a profile later cannot change its public URL
const ensureSlug: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
	const existing = data?.slug ?? originalDoc?.slug;
	if (!existing) {
		const name = data?.displayName ?? originalDoc?.displayName ?? "wajakazi";
		data.slug = generateProfileSlug(name);
	}
	return data;
};

export { ensureSlug, generateProfileSlug };
