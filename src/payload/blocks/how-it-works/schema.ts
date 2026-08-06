import type { Block } from "payload";

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
								condition: (_, siblingData) =>
									siblingData?.workingItemIconType === "text",
							},
						},
						{
							name: "workingItemIconTypeIcon",
							type: "select",
							label: "Icon",
							admin: {
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
			maxRows: 3,
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

export { HowItWorks };
