import {
	AlignFeature,
	FixedToolbarFeature,
	HeadingFeature,
	InlineToolbarFeature,
	lexicalEditor,
	OrderedListFeature,
	UnorderedListFeature,
} from "@payloadcms/richtext-lexical";
import type { Block } from "payload";

const Form: Block = {
	slug: "form",
	interfaceName: "Form",
	labels: {
		singular: "Form Block",
		plural: "Form Blocks",
	},
	fields: [
		{
			name: "form",
			type: "relationship",
			relationTo: "forms",
			required: true,
		},
		{
			name: "enableCompanionText",
			label: "Enable Companion Text",
			type: "checkbox",
		},
		{
			name: "companionText",
			type: "richText",
			label: "Companion Text",
			editor: lexicalEditor({
				features: ({ rootFeatures }) => {
					return [
						...rootFeatures,
						HeadingFeature({ enabledHeadingSizes: ["h1", "h2", "h3", "h4"] }),
						FixedToolbarFeature(),
						InlineToolbarFeature(),
						OrderedListFeature(),
						UnorderedListFeature(),
						AlignFeature(),
					];
				},
			}),
			admin: {
				condition: (_, { enableCompanionText }) => Boolean(enableCompanionText),
			},
		},
	],
};

export { Form };
