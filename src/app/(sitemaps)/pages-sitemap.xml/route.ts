import config from "@/payload-config";
import { getServerSideSitemap } from "next-sitemap";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

// cache the sitemap generation logic to prevent repeated database queries.
// the cache is busted by the 'pages-sitemap' tag, which is called from the payload hooks.
const getPagesSitemap = unstable_cache(
	async () => {
		const payload = await getPayload({ config });
		const siteURL = process.env.NEXT_PUBLIC_SERVER_URL!;

		// fetch all published pages from payload with minimal fields to keep the query fast.
		const results = await payload.find({
			collection: "pages",
			overrideAccess: false,
			draft: false,
			depth: 0,
			limit: 1000,
			pagination: false,
			where: { _status: { equals: "published" } },
			select: { slug: true, updatedAt: true },
		});

		// provide a fallback timestamp for pages missing an update date.
		const dateFallback = new Date().toISOString();

		// define static, hardcoded links that are not managed by payload's 'pages' collection.
		const defaultSitemap = [
			{ loc: `${siteURL}/search`, lastmod: dateFallback },
			{ loc: `${siteURL}/posts`, lastmod: dateFallback },
		];

		// transform payload documents into the sitemap link structure.
		const sitemap = results.docs
			? results.docs
					.filter((page) => Boolean(page?.slug))
					.map((page) => {
						return {
							loc: page?.slug === "home" ? `${siteURL}/` : `${siteURL}/${page?.slug}`,
							lastmod: page.updatedAt || dateFallback,
						};
					})
			: [];

		// combine static links with dynamically generated page links.
		return [...defaultSitemap, ...sitemap];
	},
	["pages-sitemap"],
	{ tags: ["pages-sitemap"] },
);

// route handler for generating the sitemap.xml file.
export async function GET() {
	const sitemap = await getPagesSitemap();

	return getServerSideSitemap(sitemap);
}
