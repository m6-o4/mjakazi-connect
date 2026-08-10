import {
	isAuthenticated,
	isAuthenticatedOrPublished,
} from "@/payload/access/access-control";
import { CallToAction } from "@/payload/blocks/call-to-action/schema";
import { ContentEditor } from "@/payload/blocks/content-editor/schema";
import { Features } from "@/payload/blocks/features/schema";
import { HeroPrimary } from "@/payload/blocks/hero-primary/schema";
import { HeroSecondary } from "@/payload/blocks/hero-secondary/schema";
import { HowItWorks } from "@/payload/blocks/how-it-works/schema";
import { PostsArchive } from "@/payload/blocks/posts-archive/schema";
import { Pricing } from "@/payload/blocks/pricing/schema";
import { Registration } from "@/payload/blocks/registration/schema";
import { Testimonials } from "@/payload/blocks/testimonials/schema";
import { WajakaziArchive } from "@/payload/blocks/wajakazi-archive/schema";
import {
	revalidateDelete,
	revalidatePage,
} from "@/payload/collections/pages/hooks/revalidate-page";
import { slugField } from "@/payload/fields/slug";
import { populatePublishedAt } from "@/payload/hooks/populate-published-at";
import { generatePreviewPath } from "@/payload/utilities/generate-preview-path";
import {
	MetaDescriptionField,
	MetaImageField,
	MetaTitleField,
	OverviewField,
	PreviewField,
} from "@payloadcms/plugin-seo/fields";
import type { CollectionConfig } from "payload";

/**
 * payload cms configuration for the 'pages' collection.
 * this defines the structure, access control, and behavior of your website pages.
 */
const Pages: CollectionConfig<"pages"> = {
	slug: "pages",
	access: {
		create: isAuthenticated,
		delete: isAuthenticated,
		read: isAuthenticatedOrPublished,
		update: isAuthenticated,
	},
	// this config controls what's populated by default when a page is referenced
	defaultPopulate: {
		title: true,
		slug: true,
	},
	admin: {
		defaultColumns: ["title", "slug", "createdAt", "updatedAt"],
		group: "Content",
		livePreview: {
			url: ({ data, req }) => {
				const path = generatePreviewPath({
					slug: typeof data?.slug === "string" ? data.slug : "",
					collection: "pages",
					req,
				});

				return path;
			},
		},
		preview: (data, { req }) =>
			generatePreviewPath({
				slug: typeof data?.slug === "string" ? data.slug : "",
				collection: "pages",
				req,
			}),
		useAsTitle: "title",
	},
	labels: { singular: "Page", plural: "Pages" },
	fields: [
		{ name: "title", type: "text", required: true },
		{
			type: "tabs",
			tabs: [
				{
					label: "Content",
					fields: [
						{
							name: "layout",
							type: "blocks",
							required: true,
							admin: {
								initCollapsed: true,
							},
							blocks: [
								HeroPrimary,
								HeroSecondary,
								Features,
								HowItWorks,
								WajakaziArchive,
								Pricing,
								Testimonials,
								CallToAction,
								PostsArchive,
								ContentEditor,
								Registration,
							],
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
		},
	],
	hooks: {
		afterChange: [revalidatePage],
		beforeChange: [populatePublishedAt],
		afterDelete: [revalidateDelete],
	},
	versions: {
		drafts: { autosave: { interval: 100 }, schedulePublish: true },
		maxPerDoc: 50,
	},
};

export { Pages };
