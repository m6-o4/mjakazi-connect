import type { CollectionConfig } from "payload";

import { isAdminOrOwner, isRestricted } from "@/payload/access/access-control";

// one subscription record per mwajiri, created at registration in state `none`
// and driven through its state machine by the subscription service. the
// collection is sealed — create/update/delete are refused at payload's surface
// and happen only through the service, which authorizes each transition.
//
// only the tier identity (`tierId`/`tierName`) is snapshotted at purchase;
// prices and durations are never stored here — they are read live from
// platform-settings at activation so an admin change applies with no deploy.
const Subscriptions: CollectionConfig = {
	slug: "subscriptions",
	labels: { singular: "Subscription", plural: "Subscriptions" },
	admin: {
		useAsTitle: "user",
		defaultColumns: ["user", "subscriptionState", "tierName", "tierExpiry", "updatedAt"],
		group: "SaaS",
	},
	access: {
		create: isRestricted,
		read: isAdminOrOwner("user"),
		update: isRestricted,
		delete: isRestricted,
	},
	fields: [
		{
			name: "user",
			type: "relationship",
			relationTo: "users",
			label: "Mwajiri",
			required: true,
			unique: true,
			index: true,
			// 1:1 with the mwajiri user — never re-pointed after creation
			access: { update: () => false },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "subscriptionState",
			type: "select",
			label: "Subscription State",
			required: true,
			defaultValue: "none",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
			options: [
				{ label: "None", value: "none" },
				{ label: "Pending Payment", value: "pending_payment" },
				{ label: "Active", value: "active" },
				{ label: "Expired", value: "expired" },
				{ label: "Suspended", value: "suspended" },
				{ label: "Blacklisted", value: "blacklisted" },
			],
		},
		{
			name: "tierId",
			type: "text",
			label: "Tier ID",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "tierName",
			type: "text",
			label: "Tier Name",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "tierStartedAt",
			type: "date",
			label: "Tier Started At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "tierExpiry",
			type: "date",
			label: "Tier Expiry",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "suspendedAt",
			type: "date",
			label: "Suspended At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "suspensionReason",
			type: "text",
			label: "Suspension Reason",
			admin: { readOnly: true },
		},
		{
			name: "lastPaymentId",
			type: "text",
			label: "Last Payment ID",
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	timestamps: true,
};

export { Subscriptions };
