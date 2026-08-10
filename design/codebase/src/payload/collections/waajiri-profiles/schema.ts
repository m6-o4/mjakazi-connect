import { isAdminOrProfileOwner, isRestricted } from "@/payload/access/access-control";
import type { CollectionConfig } from "payload";

// defines employer profiles linked to user accounts
const WaajiriProfiles: CollectionConfig = {
	slug: "waajiriprofiles",
	access: {
		// profiles are managed through system hooks or server-side logic
		create: isRestricted,
		update: isRestricted,
		delete: isRestricted,
		// allows admins and the profile owner to view the data
		read: isAdminOrProfileOwner,
	},
	admin: {
		useAsTitle: "displayName",
		defaultColumns: ["displayName", "moderationStatus", "createdAt", "updatedAt"],
		group: "SaaS",
	},
	labels: { singular: "Mwajiri Profile", plural: "Waajiri Profiles" },
	fields: [
		{
			// establishes a unique link to the primary user account
			name: "account",
			type: "relationship",
			label: "Account",
			relationTo: "accounts",
			required: true,
			unique: true,
			index: true,
		},
		{
			name: "displayName",
			type: "text",
			label: "Display Name",
			required: true,
			index: true,
		},
		{
			name: "organization",
			type: "text",
			label: "Organization",
			index: true,
		},
		{
			name: "phoneNumber",
			type: "text",
			label: "Phone Number",
		},
		{
			name: "location",
			type: "text",
			label: "Location",
			index: true,
		},
		{
			name: "bio",
			type: "textarea",
			label: "Bio",
		},
		{
			// tracks the status of the employer profile for safety and compliance
			name: "moderationStatus",
			type: "select",
			label: "Moderation Status",
			required: true,
			index: true,
			options: [
				{ label: "Active", value: "active" },
				{ label: "Flagged", value: "flagged" },
				{ label: "Suspended", value: "suspended" },
			],
			defaultValue: "active",
		},
		// denormalised onto the profile so dashboard renders and access checks
		// don't need to query the subscriptions collection on every request
		{
			name: "subscriptionStatus",
			type: "select",
			label: "Subscription Status",
			index: true,
			options: [
				{ label: "None", value: "none" },
				{ label: "Pending Payment", value: "pending_payment" },
				{ label: "Active", value: "active" },
				{ label: "Expired", value: "expired" },
			],
			defaultValue: "none",
		},
		{
			// points to the current active subscription record for quick lookup
			name: "activeSubscription",
			type: "relationship",
			label: "Active Subscription",
			relationTo: "subscriptions",
			admin: { readOnly: true },
		},
		{
			// cached from the active subscription — avoids a join on every page render
			name: "subscriptionEndDate",
			type: "date",
			label: "Subscription End Date",
			admin: { readOnly: true },
		},
		{
			// cached tier name for display without querying platform settings
			name: "subscriptionTierName",
			type: "text",
			label: "Subscription Tier",
			admin: { readOnly: true },
		},
	],
};

export { WaajiriProfiles };
