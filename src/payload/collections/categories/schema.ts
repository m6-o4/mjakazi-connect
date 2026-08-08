import type { CollectionConfig } from "payload";

import { isAdminOrStaff, isPublic } from "@/payload/access/access-control";

const Categories: CollectionConfig = {
	slug: "categories",
	labels: { singular: "Category", plural: "Categories" },
	admin: {
		defaultColumns: ["title", "description", "createdAt", "updatedAt"],
		group: "Content",
		useAsTitle: "title",
	},
	access: {
		create: isAdminOrStaff,
		delete: isAdminOrStaff,
		read: isPublic,
		update: isAdminOrStaff,
	},
	fields: [
		{ name: "title", type: "text", label: "Title", required: true },
		{ name: "description", type: "textarea", label: "Description" },
	],
};

export { Categories };
