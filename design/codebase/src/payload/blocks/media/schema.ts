import type { Block } from "payload";

const Media: Block = {
	slug: "media",
	interfaceName: "MediaBlock",
	labels: {
		singular: "Media Block",
		plural: "Media Blocks",
	},
	fields: [
		{
			name: "media",
			type: "upload",
			required: true,
			relationTo: "media",
		},
	],
};

export { Media };
