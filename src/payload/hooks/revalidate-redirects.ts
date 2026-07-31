import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook } from "payload";

// collection hook that runs after a redirect document is created or updated
// logs the action and triggers cache revalidation for the 'redirects' tag
// to keep frontend data in sync
const revalidateRedirects: CollectionAfterChangeHook = ({ doc, req: { payload } }) => {
	payload.logger.info("revalidating redirects...");
	revalidateTag("redirects", "max");

	return doc;
};

export { revalidateRedirects };
