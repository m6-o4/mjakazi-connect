import type { Block } from "payload";

// defines a structured layout for displaying a grid of features or services
const Features: Block = {
	slug: "features",
	interfaceName: "Features",
	labels: { singular: "Feature Block", plural: "Features Block" },
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
		// repeatable items representing individual grid cards
		{
			name: "featureItems",
			type: "array",
			label: "Feature Items",
			fields: [
				{
					name: "featureItem",
					type: "group",
					label: false,
					fields: [
						{
							name: "featureItemIconType",
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
							name: "featureItemIconTypeText",
							type: "text",
							label: "Text",
							admin: {
								// display only when text-based icon is selected
								condition: (_, siblingData) =>
									siblingData?.featureItemIconType === "text",
							},
						},
						{
							name: "featureItemIconTypeIcon",
							type: "select",
							label: "Icon",
							admin: {
								// display only when graphical icon is selected
								condition: (_, siblingData) =>
									siblingData?.featureItemIconType === "icon",
							},
							options: [
								{ label: "Lock", value: "lock" },
								{ label: "Shield", value: "shieldcheck" },
								{ label: "Users", value: "users" },
							],
						},
						{
							name: "featureItemHeadline",
							type: "text",
							label: "Item Headline",
							required: true,
						},
						{
							name: "featureItemDescription",
							type: "textarea",
							label: "Item Description",
							required: true,
						},
						{
							name: "featureItemLink",
							type: "text",
							label: "Item Link",
						},
					],
				},
			],
			required: true,
			maxRows: 3, // capped to maintain visual balance in a 3-column layout
		},
		// allows editors to toggle between light and muted background styles
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

export { Features };
