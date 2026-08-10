import type { Block } from "payload";

// defines a structured block to showcase a step-by-step process or workflow
const HowItWorks: Block = {
	slug: "howItWorks",
	interfaceName: "HowItWorks",
	labels: { singular: "How it Works Block", plural: "How it Works Block" },
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
			name: "workingItems",
			type: "array",
			label: "Working Items",
			fields: [
				{
					name: "workingItem",
					type: "group",
					label: false,
					fields: [
						{
							name: "workingItemIconType",
							type: "select",
							label: "What do you want the icon type to be?",
							required: true,
							defaultValue: "text",
							options: [
								{ label: "Text", value: "text" },
								{ label: "Icon", value: "icon" },
							],
						},
						{
							name: "workingItemIconTypeText",
							type: "text",
							label: "Text",
							admin: {
								// ensures input availability only when text-based identifiers are intended
								condition: (_, siblingData) =>
									siblingData?.workingItemIconType === "text",
							},
						},
						{
							name: "workingItemIconTypeIcon",
							type: "select",
							label: "Icon",
							admin: {
								// ensures icon selection is only available when a graphical representation is chosen
								condition: (_, siblingData) =>
									siblingData?.workingItemIconType === "icon",
							},
							options: [
								{ label: "Tally 1", value: "tallyone" },
								{ label: "Tally 2", value: "tallytwo" },
								{ label: "Tally 3", value: "tallythree" },
							],
						},
						{
							name: "workingItemHeadline",
							type: "text",
							label: "Item Headline",
							required: true,
						},
						{
							name: "workingItemDescription",
							type: "textarea",
							label: "Item Description",
							required: true,
						},
						{
							name: "workingItemLink",
							type: "text",
							label: "Item Link",
						},
					],
				},
			],
			required: true,
			// constrained to preserve the integrity of the three-column layout
			maxRows: 3,
		},
		{
			name: "backgroundVariant",
			type: "select",
			label: "Background Style",
			defaultValue: "white",
			options: [
				{ label: "Subtle", value: "subtle" },
				{ label: "White", value: "white" },
			],
			required: true,
		},
	],
};

export { HowItWorks };
