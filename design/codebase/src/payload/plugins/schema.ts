import { FormSubmission, Page, Post } from "@/payload-types";
import {
	defaultValue,
	hidden,
	label,
	name,
	placeholder,
	required,
	width,
} from "@/payload/blocks/forms/config";
import { revalidateRedirects } from "@/payload/hooks/revalidate-redirects";
import { beforeSyncWithSearch } from "@/payload/search/before-sync";
import { searchFields } from "@/payload/search/field-overrides";
import { getServerSideURL } from "@/payload/utilities/get-url";
import { payloadCloudPlugin } from "@payloadcms/payload-cloud";
import { formBuilderPlugin } from "@payloadcms/plugin-form-builder";
import { BeforeEmail } from "@payloadcms/plugin-form-builder/types";
import { redirectsPlugin } from "@payloadcms/plugin-redirects";
import { searchPlugin } from "@payloadcms/plugin-search";
import { seoPlugin } from "@payloadcms/plugin-seo";
import { GenerateTitle, GenerateURL } from "@payloadcms/plugin-seo/types";
import {
	FixedToolbarFeature,
	HeadingFeature,
	lexicalEditor,
	OrderedListFeature,
	UnorderedListFeature,
} from "@payloadcms/richtext-lexical";
import { s3Storage } from "@payloadcms/storage-s3";
import { Plugin } from "payload";

// dynamically constructs seo titles for pages and posts
// adds brand consistency by appending the company name to each document title
const generateTitle: GenerateTitle<Post | Page> = ({ doc }) => {
	return doc?.title ? `${doc.title} | Mjakazi Connect` : "Mjakazi Connect";
};

// dynamically constructs canonical urls for pages and posts
// ensures each document url aligns with the current server environment
const generateURL: GenerateURL<Post | Page> = ({ doc }) => {
	const url = getServerSideURL();
	return doc?.slug ? `${url}/${doc.slug}` : url;
};

// injects basic styling into outgoing form submission emails
// improves readability and branding without altering email content
const beforeEmail: BeforeEmail<FormSubmission> = (emails) => {
	return emails.map((email) => ({
		...email,
		html: `<div>
					<style>
						h1 { font-size: 3rem; } 
						p { font-size: 1rem; font-weight: bold; padding: 1rem; border: 1px solid darkgreen; border-radius: 0.5rem; }
					</style>
					<div>${email.html}</div>
				</div>`,
	}));
};

// determine the environment
const isProduction = process.env.NODE_ENV === "production";

// define the unified environment variables based on the environment
if (isProduction) {
	// production: use cloudflare
	process.env.S3_BUCKET = process.env.CLOUDFLARE_BUCKET!;
	process.env.S3_ACCESS_KEY_ID = process.env.CLOUDFLARE_ACCESS_KEY_ID!;
	process.env.S3_ACCESS_KEY_SECRET = process.env.CLOUDFLARE_ACCESS_KEY_SECRET!;
	process.env.S3_REGION = process.env.CLOUDFLARE_REGION!;
	process.env.S3_ENDPOINT = process.env.CLOUDFLARE_ENDPOINT!;
} else {
	// development: use minio
	process.env.S3_BUCKET = process.env.MINIO_BUCKET!;
	process.env.S3_ACCESS_KEY_ID = process.env.MINIO_ACCESS_KEY_ID!;
	process.env.S3_ACCESS_KEY_SECRET = process.env.MINIO_ACCESS_KEY_SECRET!;
	process.env.S3_REGION = process.env.MINIO_REGION!;
	process.env.S3_ENDPOINT = process.env.MINIO_ENDPOINT!;
}

// defines the central plugin configuration for the payload cms instance
// each plugin extends payload functionality to support forms, seo, search, redirects, storage, and cloud hosting
const plugins: Plugin[] = [
	// enables advanced form management with custom field controls and submission hooks
	formBuilderPlugin({
		beforeEmail,
		fields: {
			checkbox: {
				fields: [
					{ type: "row", fields: [name, label] },
					{ type: "row", fields: [width] },
					{ type: "row", fields: [required, hidden] },
				],
			},
			country: false,
			email: {
				fields: [
					{ type: "row", fields: [name, label] },
					{ type: "row", fields: [placeholder, width] },
					{ type: "row", fields: [required, hidden] },
				],
			},
			message: true,
			number: true,
			payment: false,
			phone: {
				// @ts-ignore - custom field slug definition
				slug: "phone",
				labels: { singular: "Phone Number", plural: "Phone Numbers" },
				fields: [
					{ type: "row", fields: [name, label] },
					{ type: "row", fields: [placeholder, defaultValue] },
					{ type: "row", fields: [width] },
					{ type: "row", fields: [required, hidden] },
				],
			},
			select: false,
			state: false,
			text: {
				labels: { singular: "Single-line Text", plural: "Single-line Text" },
				fields: [
					{ type: "row", fields: [name, label] },
					{ type: "row", fields: [placeholder, defaultValue] },
					{ type: "row", fields: [width] },
					{ type: "row", fields: [required, hidden] },
				],
			},
			textarea: {
				fields: [
					{ type: "row", fields: [name, label] },
					{ type: "row", fields: [placeholder] },
					{ type: "row", fields: [required, hidden] },
				],
			},
		},
		formOverrides: {
			fields: ({ defaultFields }) => {
				// modifies specific form fields to enhance editor experience and control layout
				const customizedFields = defaultFields.map((field) => {
					if ("name" in field && field.name === "confirmationMessage") {
						// replaces default editor with lexical and enables structured formatting options
						return {
							...field,
							editor: lexicalEditor({
								features: ({ rootFeatures }) => [
									...rootFeatures,
									FixedToolbarFeature(),
									HeadingFeature({
										enabledHeadingSizes: ["h1", "h2", "h3", "h4"],
									}),
									OrderedListFeature(),
									UnorderedListFeature(),
								],
							}),
						};
					}

					return field;
				});

				// appends a recaptcha requirement toggle for additional spam protection
				return [
					...customizedFields,
					{
						name: "requireRecaptcha",
						type: "checkbox",
						label: "Require reCAPTCHA",
						admin: { position: "sidebar" },
					},
				];
			},
			admin: { group: "Plugins" },
		},
		formSubmissionOverrides: { admin: { group: "Plugins" } },
		redirectRelationships: ["pages"],
	}),

	// integrates payload with the official cloud hosting platform for deployment and backups
	payloadCloudPlugin(),

	// enables server-side redirects and syncs them with static site rebuilds
	redirectsPlugin({
		collections: ["pages", "posts"],
		overrides: {
			fields: ({ defaultFields }) => {
				return defaultFields.map((field) => {
					if (typeof field === "object" && "name" in field && field.name === "from") {
						// adds admin guidance to rebuild the site when changing redirect origins
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

	// configures s3-compatible storage for media handling
	// uses env variables to allow flexible deployment across regions or providers
	s3Storage({
		collections: { media: true, vault: true },
		bucket: process.env.S3_BUCKET!,
		config: {
			credentials: {
				accessKeyId: process.env.S3_ACCESS_KEY_ID!,
				secretAccessKey: process.env.S3_ACCESS_KEY_SECRET!,
			},
			region: process.env.S3_REGION!,
			endpoint: process.env.S3_ENDPOINT!,
			forcePathStyle: true, // required for minio or local s3-compatible services
		},
	}),

	// enables indexed search with content preprocessing before sync
	// ensures consistent search accuracy and control over indexed fields
	searchPlugin({
		collections: ["posts"],
		beforeSync: beforeSyncWithSearch,
		searchOverrides: {
			fields: ({ defaultFields }) => [...defaultFields, ...searchFields],
			admin: { group: "Plugins" },
		},
	}),

	// configures seo automation for dynamic metadata generation
	// improves organic discoverability with canonical urls and custom titles
	seoPlugin({ generateTitle, generateURL }),
];

export { plugins };
