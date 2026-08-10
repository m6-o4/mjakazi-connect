import type { Block } from "payload";

// defines the structure and configuration for the wajakazi archive block in the cms
const WajakaziArchive: Block = {
	slug: "wajakaziArchive",
	interfaceName: "WajakaziArchive",
	labels: { singular: "Wajakazi Archive Block", plural: "Wajakazi Archive Blocks" },
	fields: [
		{ name: "headline", type: "text", label: "Headline" },
		{ name: "headlineDescription", type: "text", label: "Headline Description" },
		// control how many profiles display on the frontend
		{
			name: "limit",
			type: "number",
			label: "Number of Profiles to Show",
			defaultValue: 3,
			admin: { step: 1 },
		},
		{
			name: "showViewAllLink",
			type: "checkbox",
			label: "Show View All Link",
			defaultValue: true,
		},
		// configure button destination and text
		{
			type: "row",
			fields: [
				{
					name: "buttonLink",
					type: "text",
					label: "Button Link",
					required: true,
					defaultValue: "/sign-up?role=mwajiri",
					admin: { width: "50%" },
				},
				{
					name: "buttonText",
					type: "text",
					label: "Button Text",
					required: true,
					admin: { width: "50%" },
				},
			],
		},
		// configure background styling for the block
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

export { WajakaziArchive };
