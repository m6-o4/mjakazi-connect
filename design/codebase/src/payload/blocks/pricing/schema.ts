import { link } from "@/payload/fields/link";
import type { Block } from "payload";

const Pricing: Block = {
	slug: "pricing",
	interfaceName: "Pricing",
	labels: { singular: "Pricing Block", plural: "Pricing Blocks" },
	fields: [
		// headline for the pricing section to grab attention
		{
			name: "headline",
			type: "text",
			label: "Headline",
			required: true,
		},
		// brief description to provide context or a sub-headline
		{
			name: "headlineDescription",
			type: "text",
			label: "Headline Description",
			required: true,
		},
		// group to organize all pricing-related data cleanly
		{
			name: "pricing",
			type: "group",
			label: false,
			fields: [
				// array of individual pricing plans, capped at 3 for optimal layout
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
						// flag to highlight a specific plan as recommended
						{
							name: "mostPopular",
							type: "checkbox",
							label: "Most Popular?",
							defaultValue: false,
						},
						// list of features included in the plan, capped at 5 for consistency
						{
							name: "planPerks",
							type: "array",
							label: "Plan Perks",
							labels: { singular: "Plan Perk", plural: "Plan Perks" },
							fields: [{ name: "perk", type: "text", label: "Perk" }],
							maxRows: 5,
							admin: { initCollapsed: true },
						},
						// call-to-action link specific to this plan
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
		// style option to alternate visual hierarchy on the page
		{
			name: "backgroundVariant",
			type: "select",
			label: "Background Style",
			defaultValue: "subtle",
			options: [
				{ label: "Subtle", value: "subtle" },
				{ label: "White", value: "white" },
			],
			required: true,
		},
	],
};

export { Pricing };
