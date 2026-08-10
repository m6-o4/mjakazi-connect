import config from "@payload-config";
import { getServerSideSitemap } from "next-sitemap";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

// cache the sitemap generation logic to prevent repeated database queries.
// the cache is busted by the 'pages-sitemap' tag, which is called from the payload hooks.
const getPagesSitemap = unstable_cache(
	async () => {
		// initialize payload instance to interact with the database.
		const payload = await getPayload({ config });
		// get the base url from environment variables, asserting its presence.
		const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL!;

		// fetch all published pages from payload with minimal fields to keep the query fast.
		const results = await payload.find({
			collection: "pages",
			// bypass access control since sitemaps require public access regardless of user roles.
			overrideAccess: false,
			// only retrieve published documents, excluding drafts.
			draft: false,
			// avoid deep population since only slug and updatedat are needed.
			depth: 0,
			// set a high limit to ensure all pages are retrieved.
			limit: 1000,
			pagination: false,
			where: {
				_status: {
					// explicitly filter for published content.
					equals: "published",
				},
			},
			select: {
				slug: true,
				updatedAt: true,
			},
		});

		// provide a fallback timestamp for pages missing an update date.
		const dateFallback = new Date().toISOString();

		// define static, hardcoded links that are not managed by payload's 'pages' collection.
		const defaultSitemap = [
			{ loc: `${SITE_URL}/search`, lastmod: dateFallback },
			{ loc: `${SITE_URL}/posts`, lastmod: dateFallback },
		];

		// transform payload documents into the sitemap link structure.
		const sitemap = results.docs
			? results.docs
					// ensure the slug exists before attempting to map it.
					.filter((page) => Boolean(page?.slug))
					.map((page) => {
						return {
							// map the 'home' slug to the root path '/' for clean urls.
							loc: page?.slug === "home" ? `${SITE_URL}/` : `${SITE_URL}/${page?.slug}`,
							// use the page's last update time or the current date as a fallback.
							lastmod: page.updatedAt || dateFallback,
						};
					})
			: [];

		// combine static links with dynamically generated page links.
		return [...defaultSitemap, ...sitemap];
	},
	// the primary key for the cache entry.
	["pages-sitemap"],
	{
		// define tags that, when revalidated (e.g., via payload hooks), clear this cache entry.
		tags: ["pages-sitemap"],
	},
);

// route handler for generating the sitemap.xml file.
export async function GET() {
	// fetch the sitemap data, retrieving it from cache or regenerating it if the cache is stale.
	const sitemap = await getPagesSitemap();

	// serve the array of sitemap data as an xml response.
	return getServerSideSitemap(sitemap);
}
