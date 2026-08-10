import type { Field } from "payload";

// defines a set of custom fields used to store metadata for documents in the payload search index
const searchFields: Field[] = [
	// unique slug for identifying each document entry
	{
		name: "slug",
		type: "text",
		index: true,
		admin: { readOnly: true },
	},
	// group field for storing structured metadata such as title, description, and image
	{
		name: "meta",
		label: "Meta",
		type: "group",
		index: true,
		admin: { readOnly: true },
		fields: [
			// title used for search visibility and indexing
			{ type: "text", name: "title", label: "Title" },
			// short description associated with the document
			{ type: "text", name: "description", label: "Description" },
			// image reference uploaded to the media collection
			{ name: "image", label: "Image", type: "upload", relationTo: "media" },
		],
	},
	// array field for defining categories related to the indexed document
	{
		label: "Categories",
		name: "categories",
		type: "array",
		admin: { readOnly: true },
		fields: [
			// identifies the collection this category belongs to
			{ name: "relationTo", type: "text" },
			// unique id of the category item
			{ name: "categoryID", type: "text" },
			// display title of the category
			{ name: "title", type: "text" },
		],
	},
];

export { searchFields };
