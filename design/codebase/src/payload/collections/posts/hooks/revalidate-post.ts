import type { Post } from "@/payload-types";
import { revalidatePath, revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

/**
 * revalidates the post path and sitemap tag after a post document is changed.
 * handles publishing new posts and unpublishing old paths.
 */
const revalidatePost: CollectionAfterChangeHook<Post> = ({
	doc,
	previousDoc,
	req: { payload, context },
}) => {
	if (!context.disableRevalidate) {
		if (doc._status === "published") {
			const path = `/posts/${doc.slug}`;

			payload.logger.info(`Revalidating post at ${path}...`);

			revalidatePath(path);
			revalidateTag("posts-sitemap", "max");
		}

		// if the post was previously published, revalidate the old path to remove it from the cache
		if (previousDoc._status === "published" && doc._status !== "published") {
			const oldPath = `/posts/${previousDoc.slug}`;

			payload.logger.info(`Revalidating old post at ${oldPath}...`);

			revalidatePath(oldPath);
			revalidateTag("posts-sitemap", "max");
		}
	}
	return doc;
};

/**
 * revalidates the post path and sitemap tag after a post document is deleted.
 */
const revalidateDelete: CollectionAfterDeleteHook<Post> = ({ doc, req: { context } }) => {
	if (!context.disableRevalidate) {
		const path = `/posts/${doc?.slug}`;

		revalidatePath(path);
		revalidateTag("posts-sitemap", "max");
	}

	return doc;
};

export { revalidatePost, revalidateDelete };
