import type { Block } from "payload";

import { Banner } from "@/payload/blocks/banner/schema";

import {
	AlignFeature,
	BlocksFeature,
	FixedToolbarFeature,
	HeadingFeature,
	InlineToolbarFeature,
	lexicalEditor,
	OrderedListFeature,
	UnorderedListFeature,
} from "@payloadcms/richtext-lexical";

const ContentEditor: Block = {
	slug: "contentEditor",
	interfaceName: "ContentEditor",
	labels: { singular: "Content Editor Block", plural: "Content Editor Blocks" },
	fields: [
		{ name: "headline", type: "text", label: "Headline" },
		{ name: "headlineDescription", type: "text", label: "Headline Description" },
		{
			name: "editor",
			type: "richText",
			label: false,
			editor: lexicalEditor({
				features: ({ rootFeatures }) => [
					...rootFeatures,
					FixedToolbarFeature(),
					HeadingFeature({ enabledHeadingSizes: ["h1", "h2", "h3", "h4"] }),
					BlocksFeature({ blocks: [Banner] }),
					InlineToolbarFeature(),
					OrderedListFeature(),
					UnorderedListFeature(),
					AlignFeature(),
				],
			}),
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

export { ContentEditor };
