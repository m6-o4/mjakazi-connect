import type { CollectionConfig } from "payload";

import { isAdminOrOwner, isMwajiri } from "@/payload/access/access-control";

// a mwajiri's personal bookmark list of wajakazi profiles — the top of the
// browse → save → unlock funnel. saving is free (pre-subscription) and is a user
// preference, not a domain state transition, so it writes no audit entry. one
// row per (mwajiri, mjakazi), enforced by a compound unique index.
const SavedWajakazi: CollectionConfig = {
	slug: "saved-wajakazi",
	labels: { singular: "Saved Wajakazi", plural: "Saved Wajakazi" },
	admin: {
		useAsTitle: "mjakazi",
		defaultColumns: ["user", "mjakazi", "createdAt"],
		group: "SaaS",
	},
	access: {
		create: isMwajiri,
		read: isAdminOrOwner("user"),
		update: isAdminOrOwner("user"),
		delete: isAdminOrOwner("user"),
	},
	fields: [
		{
			name: "user",
			type: "relationship",
			relationTo: "users",
			label: "Mwajiri",
			required: true,
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "mjakazi",
			type: "relationship",
			relationTo: "wajakazi-profiles",
			label: "Mjakazi",
			required: true,
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	indexes: [{ fields: ["user", "mjakazi"], unique: true }],
	timestamps: true,
};

export { SavedWajakazi };
