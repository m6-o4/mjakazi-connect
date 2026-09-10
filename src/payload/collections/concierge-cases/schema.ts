import type { CollectionConfig } from "payload";

import { isAdminOrOwner, isRestricted } from "@/payload/access/access-control";

// concierge cases tracking staff-assisted matching for concierge tier subscribers.
// created automatically on payment confirmation when a concierge tier is purchased.
const ConciergeCases: CollectionConfig = {
	slug: "concierge-cases",
	access: {
		// creation, updates, and deletion are handled via concierge.service.ts
		create: isRestricted,
		update: isRestricted,
		delete: isRestricted,
		// staff/admin read all cases; waajiri read their own cases
		read: isAdminOrOwner("mwajiri"),
	},
	admin: {
		useAsTitle: "state",
		defaultColumns: ["mwajiri", "state", "assignedTo", "createdAt", "deliveredAt"],
		group: "SaaS",
	},
	labels: { singular: "Concierge Case", plural: "Concierge Cases" },
	timestamps: true,
	fields: [
		{
			// relationship to the mwajiri user who owns this concierge case
			name: "mwajiri",
			type: "relationship",
			relationTo: "users",
			required: true,
			index: true,
		},
		{
			// relationship to the subscription that granted this concierge case
			name: "subscription",
			type: "relationship",
			relationTo: "subscriptions",
			required: true,
			index: true,
		},
		{
			// state machine for concierge case progression
			name: "state",
			type: "select",
			required: true,
			defaultValue: "intake",
			index: true,
			options: [
				{ label: "Intake (Awaiting Brief)", value: "intake" },
				{ label: "In Review (Shortlisting)", value: "in_review" },
				{ label: "Shortlist Delivered", value: "shortlist_delivered" },
				{ label: "Closed", value: "closed" },
				{ label: "Replacement Requested", value: "replacement_requested" },
			],
		},
		{
			// requirements brief submitted by the mwajiri
			name: "brief",
			type: "group",
			fields: [
				{ name: "jobCategory", type: "text" },
				{ name: "location", type: "text" },
				{
					name: "workPreference",
					type: "select",
					options: [
						{ label: "Live-in", value: "live_in" },
						{ label: "Live-out", value: "live_out" },
						{ label: "Either", value: "either" },
					],
				},
				{ name: "salaryMin", type: "number" },
				{ name: "salaryMax", type: "number" },
				{ name: "familyDetails", type: "text" },
				{ name: "duties", type: "text" },
				{ name: "specialRequirements", type: "text" },
				{ name: "submittedAt", type: "date" },
			],
		},
		{
			// curated shortlist of 3-5 verified wajakazi profiles prepared by staff
			name: "shortlist",
			type: "array",
			labels: { singular: "Candidate", plural: "Shortlist Candidates" },
			fields: [
				{
					name: "candidate",
					type: "relationship",
					relationTo: "wajakazi-profiles",
					required: true,
				},
				{
					name: "matchNote",
					type: "text",
					label: "Match Note",
				},
			],
		},
		{
			// staff member assigned to work this concierge case
			name: "assignedTo",
			type: "relationship",
			relationTo: "users",
			index: true,
		},
		{
			// timestamp when the shortlist was delivered to the mwajiri
			name: "deliveredAt",
			type: "date",
		},
		{
			// recorded outcome after shortlist delivery
			name: "outcome",
			type: "select",
			options: [
				{ label: "Hired from Shortlist", value: "hired" },
				{ label: "No Candidate Suitable", value: "none_suitable" },
			],
		},
		{
			// timestamp when a one-time replacement was claimed for this case
			name: "replacementUsedAt",
			type: "date",
		},
	],
};

export { ConciergeCases };
