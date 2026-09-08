import type { CollectionConfig } from "payload";

import { isAdminOrStaff, isRestricted } from "@/payload/access/access-control";

// one hire per (mwajiri, mjakazi) — the match the whole product exists to
// produce. either party may confirm first (`confirmedBy`), which flips the
// mjakazi's availability to `hired`; the other party then agrees (`agreedAt`) or
// the placement is reversed (`reversedAt`). the collection is sealed —
// create/update/delete are refused at payload's surface and happen only through
// the hire service, which authorizes every write. reads are service-owned for
// the two SaaS surfaces, so collection read is staff/admin only for the panel.
const Hires: CollectionConfig = {
	slug: "hires",
	labels: { singular: "Hire", plural: "Hires" },
	admin: {
		useAsTitle: "mjakazi",
		defaultColumns: ["mwajiri", "mjakazi", "state", "confirmedBy", "confirmedAt"],
		group: "SaaS",
	},
	access: {
		create: isRestricted,
		read: isAdminOrStaff,
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
			name: "subscription",
			type: "relationship",
			relationTo: "subscriptions",
			label: "Subscription",
			// snapshotted from the mwajiri's subscription at confirmation time so
			// match conversion can be attributed to the access window it landed in
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "confirmedBy",
			type: "select",
			label: "Confirmed By",
			required: true,
			index: true,
			admin: { readOnly: true, position: "sidebar" },
			options: [
				{ label: "Mwajiri", value: "mwajiri" },
				{ label: "Mjakazi", value: "mjakazi" },
			],
		},
		{
			name: "confirmedAt",
			type: "date",
			label: "Confirmed At",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "agreedAt",
			type: "date",
			label: "Agreed At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "reversedAt",
			type: "date",
			label: "Reversed At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "state",
			type: "select",
			label: "State",
			required: true,
			defaultValue: "pending_agreement",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
			options: [
				{ label: "Pending Agreement", value: "pending_agreement" },
				{ label: "Agreed", value: "agreed" },
				{ label: "Reversed", value: "reversed" },
			],
		},
		{
			name: "sourceEoi",
			type: "relationship",
			relationTo: "expressions-of-interest",
			label: "Source Expression of Interest",
			// optional — the accepted EOI that led here, when there was one
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	indexes: [
		{ fields: ["mwajiri", "mjakazi"], unique: true },
		{ fields: ["mwajiri", "state"] },
		{ fields: ["mjakazi", "state"] },
	],
	timestamps: true,
};

export { Hires };
