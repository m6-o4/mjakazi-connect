import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook } from "payload";

/**
 * revalidates the 'redirects' cache tag after any change to the collection.
 */
const revalidateRedirects: CollectionAfterChangeHook = ({ doc, req: { payload } }) => {
	payload.logger.info(`Revalidating redirects...`);

	revalidateTag("redirects", "max");

	return doc;
};

export { revalidateRedirects };
