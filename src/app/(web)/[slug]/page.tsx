import { LivePreviewListener } from "@/components/payload/live-preview-listener";
import { PayloadRedirects } from "@/components/payload/payload-redirects";
import { RenderBlocks } from "@/payload/blocks/render-blocks";
import { generateMeta } from "@/payload/utilities/generate-meta";
import config from "@/payload-config";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import { getPayload } from "payload";
import { cache } from "react";

const generateStaticParams = async () => {
	const payload = await getPayload({ config: config });

	// fetch all published pages.
	const pages = await payload.find({
		collection: "pages",
		draft: false, // only consider published pages for ssg.
		limit: 1000,
		overrideAccess: false,
		pagination: false,
		select: { slug: true },
	});

	// filter out the 'home' slug and map the remaining documents to the required format.
	const params = pages.docs
		?.filter((doc) => {
			return doc.slug !== "home";
		})
		.map(({ slug }) => {
			return { slug };
		});

	// return the array of slugs for next.js ssg.
	return params || [];
};

type Args = { params: Promise<{ slug?: string }> };

const Page = async ({ params: paramsPromise }: Args) => {
	const { isEnabled: draft } = await draftMode();
	const { slug = "home" } = await paramsPromise;
	const url = "/" + slug;
	const page = await queryPageBySlug({ slug });

	// if the page is not found in the database, check for a payload-managed redirect rule.
	if (!page) {
		return <PayloadRedirects url={url} />;
	}

	const { layout } = page;

	return (
		<article>
			<PayloadRedirects disableNotFound url={url} />

			{draft && <LivePreviewListener />}

			<RenderBlocks blocks={layout || []} />
		</article>
	);
};

const generateMetadata = async ({ params: paramsPromise }: Args): Promise<Metadata> => {
	const { slug = "home" } = await paramsPromise;
	const page = await queryPageBySlug({ slug });

	return generateMeta({ doc: page });
};

const queryPageBySlug = cache(async ({ slug }: { slug: string }) => {
	const { isEnabled: draft } = await draftMode();
	const payload = await getPayload({ config: config });
	const result = await payload.find({
		collection: "pages",
		draft,
		limit: 1,
		pagination: false,
		overrideAccess: draft,
		where: { slug: { equals: slug } },
	});

	return result.docs?.[0] || null;
});

export { generateStaticParams, Page as default, generateMetadata };
