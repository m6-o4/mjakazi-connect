import type { Block } from "payload";

const PostsArchive: Block = {
	slug: "postsArchive",
	interfaceName: "PostsArchive",
	labels: { singular: "Posts Archive Block", plural: "Posts Archive Blocks" },
	fields: [
		{ name: "headline", type: "text", label: "Headline" },
		{ name: "headlineDescription", type: "text", label: "Headline Description" },
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

export { PostsArchive };
