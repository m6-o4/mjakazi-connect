import type { Block } from "payload";

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
								condition: (_, siblingData) =>
									siblingData?.featureItemIconType === "text",
							},
						},
						{
							name: "featureItemIconTypeIcon",
							type: "select",
							label: "Icon",
							admin: {
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

export { Features };
