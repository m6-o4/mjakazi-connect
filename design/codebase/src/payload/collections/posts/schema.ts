import {
	isAuthenticated,
	isAuthenticatedOrPublished,
} from "@/payload/access/access-control";
import { Banner } from "@/payload/blocks/banner/schema";
import { Media } from "@/payload/blocks/media/schema";
import { populateAuthors } from "@/payload/collections/posts/hooks/populate-authors";
import {
	revalidateDelete,
	revalidatePost,
} from "@/payload/collections/posts/hooks/revalidate-post";
import { slugField } from "@/payload/fields/slug";
import { generatePreviewPath } from "@/payload/utilities/generate-preview-path";
import {
	MetaDescriptionField,
	MetaImageField,
	MetaTitleField,
	OverviewField,
	PreviewField,
} from "@payloadcms/plugin-seo/fields";
import {
	BlocksFeature,
	FixedToolbarFeature,
	HeadingFeature,
	HorizontalRuleFeature,
	InlineToolbarFeature,
	lexicalEditor,
} from "@payloadcms/richtext-lexical";
import type { CollectionConfig } from "payload";

/**
 * payload cms configuration for the 'posts' collection (Blog Posts).
 * this defines the structure, rich text editor, access control, and behavior of your blog content.
 */
const Posts: CollectionConfig<"posts"> = {
	slug: "posts",
	access: {
		create: isAuthenticated,
		delete: isAuthenticated,
		read: isAuthenticatedOrPublished,
		update: isAuthenticated,
	},
	// This config controls what's populated by default when a post is referenced
	defaultPopulate: {
		title: true,
		slug: true,
		categories: true,
		meta: { image: true, description: true },
	},
	admin: {
		defaultColumns: ["title", "slug", "createdAt", "updatedAt"],
		group: "Content",
		livePreview: {
			url: ({ data, req }) => {
				const path = generatePreviewPath({
					slug: typeof data?.slug === "string" ? data.slug : "",
					collection: "posts",
					req,
				});

				return path;
			},
		},
		preview: (data, { req }) =>
			generatePreviewPath({
				slug: typeof data?.slug === "string" ? data.slug : "",
				collection: "posts",
				req,
			}),
		useAsTitle: "title",
	},
	labels: { singular: "Post", plural: "Posts" },
	fields: [
		{ name: "title", type: "text", required: true },
		{
			type: "tabs",
			tabs: [
				{
					label: "Content",
					fields: [
						{ name: "heroImage", type: "upload", relationTo: "media" },
						{
							name: "content",
							type: "richText",
							label: false,
							required: true,
							editor: lexicalEditor({
								features: ({ rootFeatures }) => {
									return [
										...rootFeatures,
										HeadingFeature({ enabledHeadingSizes: ["h1", "h2", "h3", "h4"] }),
										BlocksFeature({ blocks: [Banner, Media] }),
										FixedToolbarFeature(),
										InlineToolbarFeature(),
										HorizontalRuleFeature(),
									];
								},
							}),
						},
					],
				},
				{
					label: "Meta",
					fields: [
						{
							name: "relatedPosts",
							type: "relationship",
							hasMany: true,
							relationTo: "posts",
							admin: {
								position: "sidebar",
							},
							filterOptions: ({ id }) => {
								return {
									id: {
										not_in: [id],
									},
								};
							},
						},
						{
							name: "categories",
							type: "relationship",
							hasMany: true,
							relationTo: "categories",
							admin: { position: "sidebar" },
						},
					],
				},
				{
					name: "meta",
					label: "SEO",
					fields: [
						OverviewField({
							titlePath: "meta.title",
							descriptionPath: "meta.description",
							imagePath: "meta.image",
						}),
						MetaTitleField({
							hasGenerateFn: true,
						}),
						MetaImageField({
							relationTo: "media",
						}),
						MetaDescriptionField({}),
						PreviewField({
							hasGenerateFn: true,
							titlePath: "meta.title",
							descriptionPath: "meta.description",
						}),
					],
				},
			],
		},
		...slugField(),
		{
			name: "publishedAt",
			type: "date",
			label: "Date Published",
			admin: {
				date: {
					pickerAppearance: "dayOnly",
					displayFormat: "dd MMMM yyyy",
				},
				position: "sidebar",
			},
			hooks: {
				beforeChange: [
					({ siblingData, value }) => {
						if (siblingData._status === "published" && !value) {
							return new Date();
						}
						return value;
					},
				],
			},
		},
		{
			name: "authors",
			type: "relationship",
			hasMany: true,
			relationTo: "users",
			admin: { position: "sidebar" },
		},
		// this field is only used to populate the user data via the `populateAuthors` hook
		{
			name: "populatedAuthors",
			type: "array",
			access: { update: () => false },
			admin: { disabled: true, readOnly: true },
			fields: [
				{ name: "id", type: "text" },
				{ name: "name", type: "text" },
			],
		},
	],
	hooks: {
		afterChange: [revalidatePost],
		afterRead: [populateAuthors],
		afterDelete: [revalidateDelete],
	},
	versions: {
		drafts: { autosave: { interval: 100 }, schedulePublish: true },
		maxPerDoc: 50,
	},
};

export { Posts };
