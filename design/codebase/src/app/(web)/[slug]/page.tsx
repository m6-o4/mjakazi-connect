import { LivePreviewListener } from "@/components/live-preview-listener";
import { PayloadRedirects } from "@/components/payload-redirects";
import { RenderBlocks } from "@/payload/blocks/render-blocks";
import { generateMeta } from "@/payload/utilities/generate-meta";
import config from "@payload-config";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { getPayload } from "payload";
import { cache } from "react";

// generates static paths for all published pages to enable ssg
const generateStaticParams = async () => {
	const payload = await getPayload({ config: config });

	const pages = await payload.find({
		collection: "pages",
		draft: false,
		limit: 100,
		overrideAccess: false,
		pagination: false,
		select: { slug: true },
	});

	return (
		pages.docs
			// excludes the homepage as it is handled by the root index route
			.filter((doc) => doc.slug !== "home")
			.map((doc) => ({ slug: doc.slug })) || []
	);
};

type Args = { params: Promise<{ slug?: string }> };

// retrieves page data by slug with support for draft mode and request memoization
const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
	const { isEnabled: draft } = await draftMode();

	const payload = await getPayload({ config: config });

	const result = await payload.find({
		collection: "pages",
		// includes unpublished content when previewing changes
		draft,
		limit: 1,
		pagination: false,
		// bypasses standard access checks only during preview sessions
		overrideAccess: draft,
		where: {
			slug: {
				equals: slug,
			},
		},
	});

	return result.docs?.[0] || null;
});

// dynamic route handler for rendering custom page content
const Page = async ({ params: paramsPromise }: Args) => {
	const { isEnabled: draft } = await draftMode();

	const { slug = "home" } = await paramsPromise;

	const url = "/" + slug;

	const page = await queryPageBySlug({
		slug,
	});

	// handles missing pages by checking for configured redirects or returning 404
	if (!page) {
		return <PayloadRedirects url={url} />;
	}

	const { layout } = page;

	return (
		<article>
			<PayloadRedirects disableNotFound url={url} />

			{
				// enables real-time visual updates during the editing process
				draft && <LivePreviewListener />
			}

			<RenderBlocks blocks={layout} />
		</article>
	);
};

// maps payload page data to next.js metadata for seo and social sharing
const generateMetadata = async ({ params: paramsPromise }: Args): Promise<Metadata> => {
	const { slug = "home" } = await paramsPromise;

	const page = await queryPageBySlug({
		slug,
	});

	return generateMeta({ doc: page });
};

export { generateStaticParams, Page as default, generateMetadata };
