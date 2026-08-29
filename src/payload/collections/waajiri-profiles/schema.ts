import type { CollectionConfig } from "payload";

import {
	isAdmin,
	isAdminOrOwner,
	isAdminOrStaffField,
} from "@/payload/access/access-control";

// 1:1 profile for a mwajiri user. carries only identity and moderation state —
// subscription data lives on its own collection, never here. created by
// identity.service.ts, never by the user directly.
const WaajiriProfiles: CollectionConfig = {
	slug: "waajiri-profiles",
	labels: { singular: "Mwajiri Profile", plural: "Mwajiri Profiles" },
	admin: {
		useAsTitle: "user",
		defaultColumns: ["user", "phone", "location", "blacklistState", "updatedAt"],
		group: "SaaS",
	},
	access: {
		create: isAdmin,
		read: isAdminOrOwner("user"),
		update: isAdminOrOwner("user"),
		delete: isAdmin,
	},
	fields: [
		{
			name: "user",
			type: "relationship",
			relationTo: "users",
			label: "User",
			required: true,
			unique: true,
			// the profile is 1:1 with the user record — never re-pointed after creation
			access: { update: () => false },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "phone",
			type: "text",
			label: "Phone Number",
		},
		{
			name: "location",
			type: "text",
			label: "Location",
		},
		{
			name: "blacklistState",
			type: "select",
			label: "Blacklist State",
			required: true,
			defaultValue: "active",
			// staff drive this through the moderation flow, never the user
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: {
				description: "Managed by staff through the moderation flow.",
				position: "sidebar",
			},
			options: [
				{ label: "Active", value: "active" },
				{ label: "Blacklisted", value: "blacklisted" },
			],
		},
		{
			name: "blacklistedAt",
			type: "date",
			label: "Blacklisted At",
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: {
				condition: (data) => data?.blacklistState === "blacklisted",
				readOnly: true,
				position: "sidebar",
			},
		},
	],
	timestamps: true,
};

export { WaajiriProfiles };
