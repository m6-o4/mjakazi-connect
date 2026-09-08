import type { CollectionConfig } from "payload";

import { isAdminOrStaff, isRestricted } from "@/payload/access/access-control";

// one review per (mwajiri, mjakazi) — the trust signal a mwajiri leaves after a
// hire. the collection is sealed at payload's surface: every write goes through
// review.service, which enforces the unlock + agreed-hire gate, the
// one-per-pair rule and the moderation state machine. reads are staff/admin for
// the panel; workers and the public read through the service instead.
const Reviews: CollectionConfig = {
	slug: "reviews",
	labels: { singular: "Review", plural: "Reviews" },
	admin: {
		useAsTitle: "mjakazi",
		defaultColumns: ["reviewerName", "mjakazi", "rating", "state", "createdAt"],
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
			// "Jane K." — first name + last initial, snapshotted at submission so
			// the public attribution survives account rename or erasure
			name: "reviewerName",
			type: "text",
			label: "Reviewer Name",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "rating",
			type: "number",
			label: "Rating",
			required: true,
			min: 1,
			max: 5,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "comment",
			type: "textarea",
			label: "Comment",
			required: true,
			maxLength: 1000,
			admin: { readOnly: true },
		},
		{
			name: "state",
			type: "select",
			label: "State",
			required: true,
			defaultValue: "pending",
			index: true,
			options: [
				{ label: "Pending", value: "pending" },
				{ label: "Published", value: "published" },
				{ label: "Rejected", value: "rejected" },
			],
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "rejectionReason",
			type: "text",
			label: "Rejection Reason",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "reviewedAt",
			type: "date",
			label: "Reviewed At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			// worker-controlled. a hidden review stays published (and counted in
			// the audit trail) but is excluded from the public profile and its
			// aggregate — the worker sees it on their own dashboard and learns
			name: "hiddenByWorker",
			type: "checkbox",
			label: "Hidden By Worker",
			defaultValue: false,
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	indexes: [
		{ fields: ["mwajiri", "mjakazi"], unique: true },
		{ fields: ["mjakazi", "state"] },
	],
	timestamps: true,
};

export { Reviews };
