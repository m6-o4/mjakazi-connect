import config from "@payload-config";
import { getServerSideSitemap } from "next-sitemap";
import { unstable_cache } from "next/cache";
import { getPayload } from "payload";

// cache the function responsible for retrieving post slugs and last modified dates.
// this uses the next.js cache to reduce database load and ensures the sitemap is fast to serve.
const getPostsSitemap = unstable_cache(
	async () => {
		// initialize the payload instance to fetch data.
		const payload = await getPayload({ config });
		// retrieve the base url for generating absolute urls, asserting it will be defined.
		const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL!;

		// query the 'posts' collection for all published documents.
		const results = await payload.find({
			collection: "posts",
			// bypass payload's access control to ensure all public posts are indexed.
			overrideAccess: false,
			// only include final, published posts, excluding drafts.
			draft: false,
			// fetch shallow data as we only need two fields for the sitemap.
			depth: 0,
			// set a high limit to prevent pagination and retrieve all posts in one go.
			limit: 1000,
			pagination: false,
			where: {
				_status: {
					// explicit filter to ensure only published posts are included in the sitemap.
					equals: "published",
				},
			},
			select: {
				slug: true,
				updatedAt: true,
			},
		});

		// create a timestamp fallback for documents that might be missing an updatedAt field.
		const dateFallback = new Date().toISOString();

		// map the payload documents to the sitemap format required by next-sitemap.
		const sitemap = results.docs
			? results.docs
					// filter out any posts that might not have a slug defined, although payload typically enforces this.
					.filter((post) => Boolean(post?.slug))
					.map((post) => ({
						// construct the full absolute url using the post prefix and the slug.
						loc: `${SITE_URL}/posts/${post?.slug}`,
						// use the post's last updated time or the fallback date.
						lastmod: post.updatedAt || dateFallback,
					}))
			: [];

		// return the array of sitemap entries.
		return sitemap;
	},
	// define the key for this cache entry.
	["posts-sitemap"],
	{
		// use the 'posts-sitemap' tag so that the payload hook can easily revalidate (bust) this cache when a post is updated.
		tags: ["posts-sitemap"],
	},
);

// route handler for the /posts-sitemap.xml path.
export async function GET() {
	// execute the cached function to get the sitemap data.
	const sitemap = await getPostsSitemap();

	// convert the array of sitemap objects into the xml response and serve it.
	return getServerSideSitemap(sitemap);
}
