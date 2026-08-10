import type { CollectionBeforeChangeHook } from "payload";

/**
 * populates the 'publishedAt' field with the current date before a document is created or updated,
 * but only if the field is not already set in the request data.
 */
const populatePublishedAt: CollectionBeforeChangeHook = ({ data, operation, req }) => {
	if (operation === "create" || operation === "update") {
		// check if req.data exists and if publishedAt is NOT set in the incoming data
		if (req.data && !req.data.publishedAt) {
			const now = new Date();
			return {
				...data,
				publishedAt: now,
			};
		}
	}

	return data;
};

export { populatePublishedAt };
