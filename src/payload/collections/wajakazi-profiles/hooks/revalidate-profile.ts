import { revalidatePath, revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

import type { WajakaziProfile } from "@/payload-types";

// revalidates the public directory after a profile changes. the directory pages
// are dynamic today (server-rendered, no cache), so revalidatePath is a no-op —
// but this mirrors the posts hook and future-proofs the moment a directory
// sitemap or ISR caching lands, keeping the invalidation in one place
const revalidateProfile: CollectionAfterChangeHook<WajakaziProfile> = ({
	doc,
	previousDoc,
	req: { context },
}) => {
	if (context.disableRevalidate) return doc;

	revalidatePath("/directory");
	revalidateTag("directory-sitemap", "max");

	if (doc.slug) revalidatePath(`/directory/${doc.slug}`);

	// the slug is set-once, but if it ever changes the old URL must be invalidated
	if (previousDoc?.slug && previousDoc.slug !== doc.slug) {
		revalidatePath(`/directory/${previousDoc.slug}`);
	}

	return doc;
};

// revalidates the directory after a profile is deleted
const revalidateProfileDelete: CollectionAfterDeleteHook<WajakaziProfile> = ({
	doc,
	req: { context },
}) => {
	if (context.disableRevalidate) return doc;

	revalidatePath("/directory");
	revalidateTag("directory-sitemap", "max");

	if (doc?.slug) revalidatePath(`/directory/${doc.slug}`);

	return doc;
};

export { revalidateProfile, revalidateProfileDelete };
