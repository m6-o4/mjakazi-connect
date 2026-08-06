import { link } from "@/payload/fields/link";
import type { Block } from "payload";

const Pricing: Block = {
	slug: "pricing",
	interfaceName: "Pricing",
	labels: { singular: "Pricing Block", plural: "Pricing Blocks" },
	fields: [
		{
			name: "headline",
			type: "text",
			label: "Headline",
			required: true,
		},
		{
			name: "headlineDescription",
			type: "text",
			label: "Headline Description",
			required: true,
		},
		{
			name: "pricing",
			type: "group",
			label: false,
			fields: [
				{
					name: "pricingPlans",
					type: "array",
					labels: { singular: "Pricing Plan", plural: "Pricing Plans" },
					fields: [
						{ name: "planName", type: "text", label: "Plan Name", required: true },
						{
							name: "planDescription",
							type: "text",
							label: "Plan Description",
							required: true,
						},
						{ name: "planPrice", type: "text", label: "Price", required: true },
						{
							name: "mostPopular",
							type: "checkbox",
							label: "Most Popular?",
							defaultValue: false,
						},
						{
							name: "planPerks",
							type: "array",
							label: "Plan Perks",
							labels: { singular: "Plan Perk", plural: "Plan Perks" },
							fields: [{ name: "perk", type: "text", label: "Perk" }],
							maxRows: 5,
							admin: { initCollapsed: true },
						},
						{
							name: "ctaPrice",
							type: "group",
							label: false,
							fields: [link({ appearances: false })],
						},
					],
					maxRows: 3,
					admin: { initCollapsed: true },
				},
			],
			required: true,
		},
		{
			name: "backgroundVariant",
			type: "select",
			label: "Background Style",
			defaultValue: "background",
			options: [
				{ label: "Muted", value: "muted" },
				{ label: "Background", value: "background" },
			],
			required: true,
		},
	],
};

export { Pricing };
