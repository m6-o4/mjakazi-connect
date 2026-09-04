import type { GlobalConfig } from "payload";

import { isAdmin } from "@/payload/access/access-control";

// the single admin-managed source of platform pricing. the verification fee and
// the subscription tiers live here so they are never hardcoded; the mwajiri
// pricing page and purchase flow read them at runtime. read is admin-only at the
// panel surface — application code reads it through the settings service, which
// uses the local api's trusted path.
const PlatformSettings: GlobalConfig = {
	slug: "platform-settings",
	label: "Platform Settings",
	access: {
		read: isAdmin,
		update: isAdmin,
	},
	admin: {
		group: "SaaS",
	},
	fields: [
		{
			name: "verificationFee",
			type: "number",
			label: "Verification Fee (KSh)",
			required: true,
			min: 1,
			defaultValue: 1500,
			validate: (value: unknown) =>
				typeof value === "number" && Number.isInteger(value) && value >= 1
					? true
					: "The fee must be a whole number of KSh, at least KSh 1.",
			admin: {
				description:
					"The one-time fee a mjakazi pays for document review. Integer KSh only.",
			},
		},
		{
			// subscription tiers available to waajiri — admin manages these without
			// a code deploy; the mwajiri dashboard reads them at runtime
			name: "subscriptionTiers",
			type: "array",
			label: "Mwajiri Subscription Tiers",
			minRows: 1,
			labels: {
				singular: "Tier",
				plural: "Tiers",
			},
			fields: [
				{
					name: "tierId",
					type: "text",
					label: "Tier ID",
					required: true,
					admin: {
						description:
							"Machine-readable key. Snapshotted onto subscriptions at purchase — never change it after go-live.",
					},
				},
				{
					name: "name",
					type: "text",
					label: "Display Name",
					required: true,
				},
				{
					name: "price",
					type: "number",
					label: "Price (KSh)",
					required: true,
					min: 1,
					validate: (value: unknown) =>
						typeof value === "number" && Number.isInteger(value) && value >= 1
							? true
							: "Price must be a whole number of KSh, at least KSh 1.",
				},
				{
					// duration in days keeps the logic simple — 30 = monthly, 365 = annual
					name: "durationDays",
					type: "number",
					label: "Duration (Days)",
					required: true,
					min: 1,
					defaultValue: 30,
					validate: (value: unknown) =>
						typeof value === "number" && Number.isInteger(value) && value >= 1
							? true
							: "Duration must be a whole number of days, at least 1 day.",
				},
				{
					name: "description",
					type: "textarea",
					label: "Description",
				},
				{
					// allows admin to temporarily hide a tier without deleting it —
					// useful for promotional tiers or sunset plans
					name: "isActive",
					type: "checkbox",
					label: "Active",
					defaultValue: true,
				},
				{
					// a concierge tier additionally creates a concierge case on payment
					// (Phase 11). at most one tier should carry this flag
					name: "isConcierge",
					type: "checkbox",
					label: "Concierge Tier",
					defaultValue: false,
				},
			],
		},
	],
};

export { PlatformSettings };
