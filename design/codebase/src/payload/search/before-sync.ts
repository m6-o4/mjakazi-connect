import type { BeforeSync, DocToSync } from "@payloadcms/plugin-search/types";

// a hook that runs before syncing a document to the search index
// cleans and restructures the document to ensure consistent and optimized search data
const beforeSyncWithSearch: BeforeSync = async ({ req, originalDoc, searchDoc }) => {
	// extract the collection name from the search document
	const {
		doc: { relationTo: collection },
	} = searchDoc;

	// extract relevant fields from the original document
	const { slug, id, categories, title, meta } = originalDoc;

	// create the base version of the document that will be synced
	// this ensures consistent structure and proper meta field formatting
	const modifiedDoc: DocToSync = {
		...searchDoc,
		slug,
		meta: {
			...meta,
			// use meta title if available, otherwise fallback to the document title
			title: meta?.title || title,
			// store only the image id to keep the search index lightweight
			image: meta?.image?.id || meta?.image,
			description: meta?.description,
		},
		categories: [],
	};

	// if categories exist, populate them to include human-readable titles
	if (categories && Array.isArray(categories) && categories.length > 0) {
		const populatedCategories: { id: string | number; title: string }[] = [];

		for (const category of categories) {
			// skip empty category entries
			if (!category) continue;

			// if category is already populated with a title, reuse it
			if (typeof category === "object" && "title" in category) {
				populatedCategories.push(category);
				continue;
			}

			// if category is an id, fetch its document to get the title
			const doc = await req.payload.findByID({
				collection: "categories",
				id: category as string | number,
				disableErrors: true,
				depth: 0,
				select: { title: true },
				req,
			});

			// push the result if found, otherwise log a warning for debugging
			if (doc !== null) {
				populatedCategories.push(doc);
			} else {
				console.error(
					`Failed to sync category for collection '${collection}' with id '${id}': The category was not found.`,
				);
			}
		}

		// transform populated categories into the structure expected by the search plugin
		modifiedDoc.categories = populatedCategories.map((each) => ({
			relationTo: "categories",
			categoryID: String(each.id),
			title: each.title,
		}));
	}

	// return the final cleaned and structured document for indexing
	return modifiedDoc;
};

export { beforeSyncWithSearch };
