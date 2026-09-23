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
		{
			// the expression-of-interest policy. admin-tunable so the anti-spam
			// limits move without a deploy — eoi.service reads them at runtime and
			// falls back to the defaults below when the global is unset.
			name: "eoiPolicy",
			type: "group",
			label: "Expression of Interest Policy",
			fields: [
				{
					name: "minBatch",
					type: "number",
					label: "Minimum Batch Size",
					required: true,
					min: 1,
					defaultValue: 1,
					validate: (value: unknown) =>
						typeof value === "number" && Number.isInteger(value) && value >= 1
							? true
							: "The minimum batch must be a whole number, at least 1.",
					admin: {
						description:
							"Fewest wajakazi a mwajiri may select in one expression-of-interest batch.",
					},
				},
				{
					name: "maxBatch",
					type: "number",
					label: "Maximum Batch Size",
					required: true,
					min: 1,
					defaultValue: 5,
					validate: (value: unknown) =>
						typeof value === "number" && Number.isInteger(value) && value >= 1
							? true
							: "The maximum batch must be a whole number, at least 1.",
					admin: {
						description:
							"Most wajakazi a mwajiri may select in one expression-of-interest batch.",
					},
				},
				{
					name: "responseThresholdPercent",
					type: "number",
					label: "Response Threshold (%)",
					required: true,
					min: 1,
					max: 100,
					defaultValue: 50,
					validate: (value: unknown) =>
						typeof value === "number" &&
						Number.isInteger(value) &&
						value >= 1 &&
						value <= 100
							? true
							: "The threshold must be a whole percentage between 1 and 100.",
					admin: {
						description:
							"A new batch is allowed only once more than this share of the open batches has been resolved (accepted, rejected or expired).",
					},
				},
				{
					name: "expiryDays",
					type: "number",
					label: "Interest Expiry (Days)",
					required: true,
					min: 1,
					defaultValue: 7,
					validate: (value: unknown) =>
						typeof value === "number" && Number.isInteger(value) && value >= 1
							? true
							: "The expiry must be a whole number of days, at least 1.",
					admin: {
						description:
							"An unanswered expression of interest expires after this many days and counts as resolved.",
					},
				},
				{
					name: "resendCooldownDays",
					type: "number",
					label: "Re-send Cooldown (Days)",
					required: true,
					min: 0,
					defaultValue: 14,
					validate: (value: unknown) =>
						typeof value === "number" && Number.isInteger(value) && value >= 0
							? true
							: "The cooldown must be a whole number of days, 0 or more.",
					admin: {
						description:
							"How long before a mwajiri may approach the same mjakazi again after a rejection or expiry.",
					},
				},
			],
		},
	],
};

export { PlatformSettings };
