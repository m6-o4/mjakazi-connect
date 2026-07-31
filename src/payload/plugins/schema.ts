import { Page, Post } from "@/payload-types";
import { s3Storage } from "@payloadcms/storage-s3";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { seoPlugin } from "@payloadcms/plugin-seo";
import { getServerSideURL } from "@/payload/utilities/get-url";
import { GenerateTitle, GenerateURL } from "@payloadcms/plugin-seo/types";
import { revalidateRedirects } from "@/payload/hooks/revalidate-redirects";
import { Plugin } from "payload";

// retrieve values from the environment variables.
const bucket = process.env.S3_BUCKET!;
const accessKeyId = process.env.S3_ACCESS_KEY_ID!;
const accessKeySecret = process.env.S3_ACCESS_KEY_SECRET!;
const region = process.env.S3_REGION!;
const endpoint = process.env.S3_ENDPOINT!;

// dynamically constructs seo titles for pages and posts
// adds brand consistency by appending the company name to each document title
const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
	return doc?.title
		? `${doc.title} | Superior Software Solutions`
		: "Superior Software Solutions";
};

// dynamically constructs canonical urls for pages and posts
// ensures each document url aligns with the current server environment
const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
	const url = getServerSideURL();
	return doc?.slug ? `${url}/${doc.slug}` : url;
};

// defines the central plugin configuration for the payload cms instance
// each plugin extends payload functionality to support forms, seo, search,
// redirects, storage and cloud hosting
const plugins: Plugin[] = [
	s3Storage({
		collections: { media: true },
		bucket: bucket,
		config: {
			credentials: {
				accessKeyId: accessKeyId,
				secretAccessKey: accessKeySecret,
			},
			region: region,
			endpoint: endpoint,
			forcePathStyle: true, // required for minio
		},
	}),

	// configures seo automation for dynamic metadata generation
	// improves organic discoverability with canonical urls and custom titles
	seoPlugin({ generateTitle, generateURL }),

	// enables server-side redirects and syncs them with static site rebuilds
	redirectsPlugin({
		collections: ["pages", "posts"],
		overrides: {
			fields: ({ defaultFields }) => {
				return defaultFields.map((field) => {
					if (typeof field === "object" && "name" in field && field.name === "from") {
						return {
							...field,
							admin: {
								...(field.admin ?? {}),
								description:
									"You will need to rebuild the website when changing this field.",
							},
						} as typeof field;
					}
					return field;
				}) as typeof defaultFields;
			},
			hooks: { afterChange: [revalidateRedirects] },
			admin: { group: "Plugins" },
		},
	}),
];

export { plugins };
