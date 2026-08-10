import {
	FixedToolbarFeature,
	InlineToolbarFeature,
	lexicalEditor,
} from "@payloadcms/richtext-lexical";
import type { Block } from "payload";

const Banner: Block = {
	slug: "banner",
	interfaceName: "BannerBlock",
	labels: {
		singular: "Banner Block",
		plural: "Banner Blocks",
	},
	fields: [
		{
			name: "style",
			type: "select",
			required: true,
			defaultValue: "info",
			options: [
				{ label: "Info", value: "info" },
				{ label: "Warning", value: "warning" },
				{ label: "Error", value: "error" },
				{ label: "Success", value: "success" },
			],
		},
		{
			name: "content",
			type: "richText",
			required: true,
			label: false,
			editor: lexicalEditor({
				features: ({ rootFeatures }) => {
					return [...rootFeatures, FixedToolbarFeature(), InlineToolbarFeature()];
				},
			}),
		},
	],
};

export { Banner };
