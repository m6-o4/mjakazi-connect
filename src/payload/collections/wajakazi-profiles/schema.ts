import type { CollectionConfig } from "payload";

import {
	isAdmin,
	isAdminOrOwner,
	isAdminOrStaffField,
	isDirectoryVisibleOrOwner,
} from "@/payload/access/access-control";

// 1:1 profile for a mjakazi user. the single record everything downstream hangs
// off — verification state, documents, the directory listing, expressions of
// interest. created by identity.service.ts, never by the user directly.
const WajakaziProfiles: CollectionConfig = {
	slug: "wajakazi-profiles",
	labels: { singular: "Mjakazi Profile", plural: "Mjakazi Profiles" },
	admin: {
		useAsTitle: "displayName",
		defaultColumns: ["user", "verificationState", "availabilityStatus", "updatedAt"],
		group: "SaaS",
	},
	access: {
		create: isAdmin,
		read: isDirectoryVisibleOrOwner,
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
			name: "displayName",
			type: "text",
			label: "Display Name",
			required: true,
		},
		{
			name: "verificationState",
			type: "select",
			label: "Verification State",
			required: true,
			defaultValue: "draft",
			index: true,
			// staff/admin drive this through the verification service. a mjakazi must
			// never set their own verification state, so it is locked at field level
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: {
				description:
					"Managed by staff through the verification flow — a mjakazi never sets this directly.",
				position: "sidebar",
			},
			options: [
				{ label: "Draft", value: "draft" },
				{ label: "Pending Payment", value: "pending_payment" },
				{ label: "Pending Review", value: "pending_review" },
				{ label: "Verified", value: "verified" },
				{ label: "Rejected", value: "rejected" },
				{ label: "Verification Expired", value: "verification_expired" },
				{ label: "Blacklisted", value: "blacklisted" },
				{ label: "Deactivated", value: "deactivated" },
			],
		},
		{
			name: "availabilityStatus",
			type: "select",
			label: "Availability",
			required: true,
			defaultValue: "available",
			options: [
				{ label: "Available", value: "available" },
				{ label: "Hired", value: "hired" },
				{ label: "On a Break", value: "on_break" },
			],
		},
		{
			name: "profileComplete",
			type: "checkbox",
			label: "Profile Complete",
			defaultValue: false,
			// computed by the profile service, never set by the user directly
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	timestamps: true,
};

export { WajakaziProfiles };
