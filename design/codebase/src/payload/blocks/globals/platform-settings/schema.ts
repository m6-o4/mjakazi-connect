import { isSA } from "@/payload/access/access-control";
import type { GlobalConfig } from "payload";

// singleton global for platform-wide configuration that only super-admins
// should be able to view or change — keeps business-critical values out of
// reach for regular admins and prevents accidental edits via the CMS UI
const PlatformSettings: GlobalConfig = {
	slug: "platform-settings",
	label: "Platform Settings",
	access: { read: isSA, update: isSA },
	fields: [
		{
			// base onboarding cost charged to new workers; stored here so it can
			// be adjusted without a code deploy — consumed by the payments flow
			name: "registrationFee",
			type: "number",
			label: "Mjakazi Registration Fee (KSh)",
			required: true,
			defaultValue: 1500,
			min: 1,
		},
		{
			// subscription tiers available to waajiri — sa manages these without
			// a code deploy; the Mwajiri dashboard reads them at runtime
			name: "subscriptionTiers",
			type: "array",
			label: "Mwajiri Subscription Tiers",
			minRows: 1,
			fields: [
				{
					name: "tierId",
					type: "text",
					label: "Tier ID",
					required: true,
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
				},
				{
					// duration in days keeps the logic simple — 30 = monthly, 365 = annual
					name: "durationDays",
					type: "number",
					label: "Duration (Days)",
					required: true,
					min: 1,
					defaultValue: 30,
				},
				{
					name: "description",
					type: "textarea",
					label: "Description",
				},
				{
					// allows sa to temporarily hide a tier without deleting it —
					// useful for promotional tiers or sunset plans
					name: "isActive",
					type: "checkbox",
					label: "Active",
					defaultValue: true,
				},
			],
		},
	],
};

export { PlatformSettings };
