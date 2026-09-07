import type { Block } from "payload";

const WajakaziArchive: Block = {
	slug: "wajakaziArchive",
	interfaceName: "WajakaziArchive",
	labels: { singular: "Wajakazi Archive Block", plural: "Wajakazi Archive Blocks" },
	fields: [
		{ name: "headline", type: "text", label: "Headline" },
		{ name: "headlineDescription", type: "text", label: "Headline Description" },
		{
			name: "showViewAllLink",
			type: "checkbox",
			label: "Show View All Link",
			defaultValue: true,
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
