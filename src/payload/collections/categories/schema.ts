import type { CollectionConfig } from "payload";

import { isAdminOrEditor, isPublic } from "@/payload/access/access-control";

const Categories: CollectionConfig = {
	slug: "categories",
	labels: { singular: "Category", plural: "Categories" },
	admin: {
		defaultColumns: ["title", "description", "createdAt", "updatedAt"],
		group: "Content",
		useAsTitle: "title",
	},
	access: {
		create: isAdminOrEditor,
		delete: isAdminOrEditor,
		read: isPublic,
		update: isAdminOrEditor,
	},
	fields: [
		{ name: "title", type: "text", label: "Title", required: true },
		{ name: "description", type: "textarea", label: "Description" },
	],
};

export { Categories };
