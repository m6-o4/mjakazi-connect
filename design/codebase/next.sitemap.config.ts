import { IConfig } from "next-sitemap";

// next-sitemap.config.ts

// picks the public server url as the single source of truth so all sitemap
// output stays consistent across environments.
const SITE_URL = process.env.NEXT_PUBLIC_SERVER_URL!;

// central config for next-sitemap that governs how crawlers discover content.
const config: IConfig = {
	siteUrl: SITE_URL,

	// ensures robots.txt is generated so crawlers have a clear set of rules.
	generateRobotsTxt: true,

	// removes specific dynamic routes and the segmented sitemap files from the primary sitemap.xml.
	// the segmented sitemap files themselves are excluded because they are included via 'additionalSitemaps' in the robots.txt.
	// the dynamic routes are excluded because they are handled by the dedicated sitemap files.
	exclude: ["/posts/*", "/posts-sitemap.xml", "/pages-sitemap.xml"],

	robotsTxtOptions: {
		policies: [
			{
				// applies the same rule to all bots to prevent unwanted crawling
				// inside the admin interface.
				userAgent: "*",
				disallow: "/admin/*",
			},
		],

		// explicitly lists the sitemaps that represent meaningful public content
		// this is how crawlers discover your segmented sitemaps (pages, posts, services).
		additionalSitemaps: [
			`${SITE_URL}/pages-sitemap.xml`,
			`${SITE_URL}/posts-sitemap.xml`,
		],
	},
};

export { config as default };
