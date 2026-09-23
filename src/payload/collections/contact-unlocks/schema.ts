import type { CollectionConfig } from "payload";

import { isAdminOrOwner, isRestricted } from "@/payload/access/access-control";

// a durable contact grant — one row per (mwajiri, mjakazi), written only by
// contact.service. the collection is sealed (create/update/delete refused at
// payload's surface), and the row is never re-pointed or deleted, because a grant
// is permanent: it keeps the contact visible after the subscription expires.
//
// the current source is an accepted expression of interest (`eoi`); the retired
// subscription-gated direct reveal is kept as `subscription_reveal` so grants
// created before the change stay distinguishable.
const ContactUnlocks: CollectionConfig = {
	slug: "contact-unlocks",
	labels: { singular: "Contact Unlock", plural: "Contact Unlocks" },
	admin: {
		useAsTitle: "mjakazi",
		defaultColumns: ["mwajiri", "mjakazi", "source", "unlockedAt"],
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
			// what produced the grant. eoi is the current path (an accepted
			// expression of interest); concierge is a staff-delivered shortlist, and
			// subscription_reveal is the retired subscription-gated direct reveal —
			// kept so older rows stay identifiable
			name: "source",
			type: "select",
			label: "Source",
			required: true,
			defaultValue: "eoi",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
			options: [
				{ label: "Accepted interest", value: "eoi" },
				{ label: "Concierge shortlist", value: "concierge" },
				{ label: "Subscription reveal", value: "subscription_reveal" },
			],
		},
		{
			// the expression of interest whose acceptance produced this grant
			name: "sourceEoi",
			type: "relationship",
			relationTo: "expressions-of-interest",
			label: "Source Interest",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "tierAtUnlock",
			type: "text",
			label: "Tier At Unlock",
			// snapshotted from the active subscription at reveal time on the retired
			// path, like the tier snapshots on payments — never re-pointed. unset on
			// grants created by an accepted interest
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
