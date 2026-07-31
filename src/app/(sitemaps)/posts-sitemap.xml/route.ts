import config from "@/payload-config";
import { getServerSideSitemap } from "next-sitemap";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

// cache the function responsible for retrieving post slugs and last modified dates.
// this uses the next.js cache to reduce database load and ensures the sitemap
// is fast to serve.
const getPostsSitemap = unstable_cache(
	async () => {
		const payload = await getPayload({ config });
		const siteURL = process.env.NEXT_PUBLIC_SERVER_URL!;

		// query the 'posts' collection for all published documents.
		const results = await payload.find({
			collection: "posts",
			overrideAccess: false,
			draft: false,
			depth: 0,
			limit: 1000,
			pagination: false,
			where: { _status: { equals: "published" } },
			select: { slug: true, updatedAt: true },
		});

		// create a timestamp fallback for documents that might be missing an updatedAt field.
		const dateFallback = new Date().toISOString();

		// map the payload documents to the sitemap format required by next-sitemap.
		const sitemap = results.docs
			? results.docs
					.filter((post) => Boolean(post?.slug))
					.map((post) => ({
						loc: `${siteURL}/posts/${post?.slug}`,
						lastmod: post.updatedAt || dateFallback,
					}))
			: [];

		return sitemap;
	},
	["posts-sitemap"],
	{ tags: ["posts-sitemap"] },
);

// route handler for the /posts-sitemap.xml path.
export async function GET() {
	const sitemap = await getPostsSitemap();

	return getServerSideSitemap(sitemap);
}
