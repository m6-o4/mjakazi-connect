import type { CollectionConfig } from "payload";

import { isAdminOrOwner, isRestricted } from "@/payload/access/access-control";

// a durable contact grant — one row per (mwajiri, mjakazi), written only by
// contact.service after an active-subscription check and an audit entry. the
// collection is sealed (create/update/delete refused at payload's surface), and
// the row is never re-pointed or deleted, because an unlock is permanent: it
// keeps a previously revealed contact visible after the subscription expires.
const ContactUnlocks: CollectionConfig = {
	slug: "contact-unlocks",
	labels: { singular: "Contact Unlock", plural: "Contact Unlocks" },
	admin: {
		useAsTitle: "mjakazi",
		defaultColumns: ["mwajiri", "mjakazi", "tierAtUnlock", "unlockedAt"],
		group: "SaaS",
	},
	access: {
		create: isRestricted,
		read: isAdminOrOwner("mwajiri"),
		update: isRestricted,
		delete: isRestricted,
	},
	fields: [
		{
			name: "mwajiri",
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
		{
			name: "tierAtUnlock",
			type: "text",
			label: "Tier At Unlock",
			// snapshotted from the active subscription at reveal time, like the
			// tier snapshots on payments — never re-pointed afterwards
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "unlockedAt",
			type: "date",
			label: "Unlocked At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "subscription",
			type: "relationship",
			relationTo: "subscriptions",
			label: "Subscription",
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	indexes: [{ fields: ["mwajiri", "mjakazi"], unique: true }],
	timestamps: true,
};

export { ContactUnlocks };
