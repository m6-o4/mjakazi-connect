import type { Config } from "@/payload-types";
import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

// represents all available collection slugs defined in payload config
type Collection = keyof Config["collections"];

// fetches a single document from payload by its collection and slug
const getDocument = async (collection: Collection, slug: string, depth = 0) => {
	// initialize payload instance with config
	const payload = await getPayload({ config });

	// query the collection for a document whose slug matches the provided value
	const page = await payload.find({
		collection,
		depth,
		where: { slug: { equals: slug } },
	});

	// return the first matching document
	return page.docs[0];
};

// creates a cached version of getDocument using next's unstable_cache
// ties cache identity to both the collection and slug for efficient reuse
const getCachedDocument = (collection: Collection, slug: string) =>
	unstable_cache(async () => getDocument(collection, slug), [collection, slug], {
		tags: [`${collection}_${slug}`],
	});

export { getDocument, getCachedDocument };
