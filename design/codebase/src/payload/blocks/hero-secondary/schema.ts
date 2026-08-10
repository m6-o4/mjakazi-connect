import type { Block } from "payload";

// defines the structure for a simplified hero section intended for inner site pages
const HeroSecondary: Block = {
	slug: "heroSecondary",
	interfaceName: "HeroSecondary",
	labels: { singular: "Secondary Hero Block", plural: "Secondary Hero Blocks" },
	fields: [
		{
			// captures the main title for the page or section
			name: "heroHeadline",
			type: "text",
			label: "Hero Headline",
			required: true,
		},
		{
			// captures the supporting description to provide additional page context
			name: "heroDescription",
			type: "text",
			label: "Hero Description",
			required: true,
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

export { HeroSecondary };
