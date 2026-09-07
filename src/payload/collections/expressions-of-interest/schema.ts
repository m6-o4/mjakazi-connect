import type { CollectionConfig } from "payload";

import { isAdminOrStaff, isRestricted } from "@/payload/access/access-control";

// one expression of interest per (mwajiri, mjakazi) per send. a mwajiri sends a
// batch of 3–5 at once, each sharing a `batchId`; the mjakazi accepts or rejects
// each one. the collection is sealed — create/update/delete are refused at
// payload's surface and happen only through the eoi service, which authorizes
// every write. reads are service-owned too (the service is the only reader for
// the two SaaS surfaces), so collection read is staff/admin only for the panel.
const ExpressionsOfInterest: CollectionConfig = {
	slug: "expressions-of-interest",
	labels: { singular: "Expression of Interest", plural: "Expressions of Interest" },
	admin: {
		useAsTitle: "mjakazi",
		defaultColumns: ["mwajiri", "mjakazi", "state", "sentAt", "updatedAt"],
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
			name: "batchId",
			type: "text",
			label: "Batch ID",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			// `<mwajiri>:<mjakazi>` while an interest is outstanding, uniquified on
			// rejection. the unique index is the hard backstop for "one outstanding
			// interest per pair" — a concurrent duplicate send fails here instead of
			// creating a second record. never surfaced in any UI.
			name: "pendingKey",
			type: "text",
			label: "Pending Key",
			unique: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "state",
			type: "select",
			label: "State",
			required: true,
			defaultValue: "sent",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
			options: [
				{ label: "Sent", value: "sent" },
				{ label: "Accepted", value: "accepted" },
				{ label: "Rejected", value: "rejected" },
				// reserved — no code transitions into it yet (8.1)
				{ label: "Expired", value: "expired" },
			],
		},
		{
			name: "sentAt",
			type: "date",
			label: "Sent At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "respondedAt",
			type: "date",
			label: "Responded At",
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	indexes: [{ fields: ["mwajiri", "mjakazi"] }],
	timestamps: true,
};

export { ExpressionsOfInterest };
