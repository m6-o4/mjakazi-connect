/** @type {import('next-sitemap').IConfig} */

// retrieve values from the environment variables
const siteURL = process.env.NEXT_PUBLIC_SERVER_URL;

// central config for next-sitemap that governs how crawlers discover content.
const config = {
	siteUrl: siteURL,

	// ensures robots.txt is generated so crawlers have a clear set of rules.
	generateRobotsTxt: true,

	exclude: ["/posts/*", "/posts-sitemap.xml", "/pages-sitemap.xml"],

	robotsTxtOptions: {
		policies: [{ userAgent: "*", disallow: "/admin/*" }],
		additionalSitemaps: [`${siteURL}/pages-sitemap.xml`, `${siteURL}/posts-sitemap.xml`],
	},
};

export default config;
