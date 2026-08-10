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
import type { Block } from "payload";

const ContentEditor: Block = {
	slug: "contentEditor",
	interfaceName: "ContentEditor",
	labels: {
		singular: "Content Editor Block",
		plural: "Content Editor Blocks",
	},
	fields: [
		// optional intro text displayed above the rich text content
		{
			name: "headline",
			type: "text",
			label: "Headline",
		},
		{
			name: "headlineDescription",
			type: "text",
			label: "Headline Description",
		},
		// main content area using lexical editor with specific features enabled
		// allows for nested blocks (like banner) within the flow of text
		{
			name: "editor",
			type: "richText",
			label: false,
			editor: lexicalEditor({
				features: ({ rootFeatures }) => [
					...rootFeatures,
					FixedToolbarFeature(),
					// limit heading levels to maintain semantic hierarchy
					HeadingFeature({ enabledHeadingSizes: ["h1", "h2", "h3", "h4"] }),
					// allow insertion of specific custom blocks within the text content
					BlocksFeature({ blocks: [Banner] }),
					InlineToolbarFeature(),
					OrderedListFeature(),
					UnorderedListFeature(),
					AlignFeature(),
				],
			}),
		},
		// allows editors to toggle between background colors for visual sectioning
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

export { ContentEditor };
