import type { Config } from "@/payload-types";
import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

// represents all available global slugs defined in payload config
type Global = keyof Config["globals"];

// maps each slug to its specific global type from payload config
type DataFromGlobalSlug<TSlug extends Global> = Config["globals"][TSlug];

// fetches a single global document from payload using its slug
const getGlobal = async <TSlug extends Global>(
	slug: TSlug,
	depth = 0,
): Promise<DataFromGlobalSlug<TSlug>> => {
	// initialize payload with its config
	const payload = await getPayload({ config });

	// fetch the global document by slug with optional population depth
	const global = await payload.findGlobal({ slug, depth });

	// return the result cast to the correct inferred type
	return global as DataFromGlobalSlug<TSlug>;
};

// creates a cached version of getGlobal tied to a specific slug
// ensures data reuse and avoids repeated fetching
const getCachedGlobal = <TSlug extends Global>(slug: TSlug, depth = 0) =>
	unstable_cache(async () => getGlobal(slug, depth), [slug], {
		tags: [`global_${slug}`],
	});

export { getGlobal, getCachedGlobal };
