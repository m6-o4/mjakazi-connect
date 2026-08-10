import { link } from "@/payload/fields/link";
import type { Block } from "payload";

// defines the content structure for the main landing page hero section
const HeroPrimary: Block = {
	slug: "heroPrimary",
	interfaceName: "HeroPrimary",
	labels: { singular: "Primary Hero Block", plural: "Primary Hero Blocks" },
	fields: [
		{
			name: "heroOverline",
			type: "text",
			label: "Hero Overline",
		},
		{
			name: "heroHeadline",
			type: "text",
			label: "Hero Headline",
			required: true,
		},
		{
			name: "heroDescription",
			type: "text",
			label: "Hero Description",
			required: true,
		},
		// groups fields for the primary mjakazi engagement conversion path
		{
			name: "ctaMjakazi",
			type: "group",
			label: "Find a Mjakazi",
			fields: [link({ appearances: false })],
		},
		// groups fields for the secondary service provider registration path
		{
			name: "ctaRegistration",
			type: "group",
			label: "Register Now",
			fields: [link({ appearances: false })],
		},
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

export { HeroPrimary };
