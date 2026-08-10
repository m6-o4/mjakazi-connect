import config from "@payload-config";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

// retrieves all redirect documents from the payload 'redirects' collection
// accepts an optional depth parameter for relation population
const getRedirects = async (depth = 1) => {
	const payload = await getPayload({ config });
	const { docs: redirects } = await payload.find({
		collection: "redirects",
		depth,
		limit: 0,
		pagination: false,
	});
	return redirects;
};

// returns a cached version of getRedirects using next.js unstable_cache
// caches all redirects under a shared tag to reduce duplicate fetches
const getCachedRedirects = () =>
	unstable_cache(async () => getRedirects(), ["redirects"], {
		tags: ["redirects"],
	});

export { getRedirects, getCachedRedirects };
