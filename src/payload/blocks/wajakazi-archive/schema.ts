import type { Block } from "payload";

const WajakaziArchive: Block = {
	slug: "wajakaziArchive",
	interfaceName: "WajakaziArchive",
	labels: { singular: "Wajakazi Archive Block", plural: "Wajakazi Archive Blocks" },
	fields: [
		{ name: "headline", type: "text", label: "Headline" },
		{ name: "headlineDescription", type: "text", label: "Headline Description" },
		{
			name: "limit",
			type: "number",
			label: "Number of Profiles to Show",
			defaultValue: 3,
			min: 1,
			admin: { step: 1 },
		},
		{
			name: "showViewAllLink",
			type: "checkbox",
			label: "Show View All Link",
			defaultValue: true,
		},
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
					defaultValue: "View Profile",
					admin: { width: "50%" },
				},
			],
		},
		{
			name: "backgroundVariant",
			type: "select",
			label: "Background Style",
			defaultValue: "muted",
			options: [
				{ label: "Muted", value: "muted" },
				{ label: "Background", value: "background" },
			],
			required: true,
		},
	],
};

export { WajakaziArchive };
