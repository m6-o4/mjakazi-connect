import { revalidatePath, revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook, CollectionAfterDeleteHook } from "payload";

import type { WajakaziProfile } from "@/payload-types";

// revalidates the public directory and the homepage latest-verified block after
// a profile changes. the directory pages are dynamic today (server-rendered, no
// cache), so revalidatePath on them is a no-op — but the homepage is static, so
// "/" must be invalidated to refresh the latest-verified block. this mirrors the
// posts hook and keeps the invalidation in one place
const revalidateProfile: CollectionAfterChangeHook<WajakaziProfile> = ({
	doc,
	previousDoc,
	req: { context },
}) => {
	if (context.disableRevalidate) return doc;

	revalidatePath("/");
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

	revalidatePath("/");
	revalidatePath("/directory");
	revalidateTag("directory-sitemap", "max");

	if (doc?.slug) revalidatePath(`/directory/${doc.slug}`);

	return doc;
};

export { revalidateProfile, revalidateProfileDelete };
