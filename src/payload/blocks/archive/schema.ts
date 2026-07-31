import {
	FixedToolbarFeature,
	HeadingFeature,
	InlineToolbarFeature,
	lexicalEditor,
} from "@payloadcms/richtext-lexical";

import type { Block } from "payload";

const Archive: Block = {
	slug: "archive",
	interfaceName: "Archive",
	labels: { singular: "Post Archive Block", plural: "Post Archive Blocks" },
	fields: [
		{
			name: "introContent",
			type: "richText",
			label: "Introductory Content",
			editor: lexicalEditor({
				features: ({ rootFeatures }) => {
					return [
						...rootFeatures,
						HeadingFeature({ enabledHeadingSizes: ["h1", "h2", "h3", "h4"] }),
						FixedToolbarFeature(),
						InlineToolbarFeature(),
					];
				},
			}),
		},
		{
			name: "populateBy",
			type: "select",
			label: "Populate By",
			defaultValue: "collection",
			options: [
				{ label: "Collection", value: "collection" },
				{ label: "Individual Selection", value: "selection" },
			],
		},
		{
			name: "relationTo",
			type: "select",
			label: "Collections To Show",
			defaultValue: "posts",
			options: [{ label: "Posts", value: "posts" }],
			admin: { condition: (_, siblingData) => siblingData.populateBy === "collection" },
		},
		{
			name: "categories",
			type: "relationship",
			label: "Categories To Show",
			relationTo: "categories",
			hasMany: true,
			admin: { condition: (_, siblingData) => siblingData.populateBy === "collection" },
		},
		{
			name: "limit",
			type: "number",
			label: "Limit",
			defaultValue: 10,
			admin: {
				condition: (_, siblingData) => siblingData.populateBy === "collection",
				step: 1,
			},
		},
		{
			name: "selectedDocs",
			type: "relationship",
			label: "Selection",
			relationTo: ["posts"],
			hasMany: true,
			admin: { condition: (_, siblingData) => siblingData.populateBy === "selection" },
		},
	],
};

export { Archive };
