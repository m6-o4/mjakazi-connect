import { Container } from "@/components/container";
import { LivePreviewListener } from "@/components/live-preview-listener";
import { PayloadRedirects } from "@/components/payload-redirects";
import { RichText } from "@/components/rich-text";
import { Badge } from "@/components/ui/badge";
import { formatAuthors } from "@/payload/utilities/format-authors";
import { formatDate } from "@/payload/utilities/format-date";
import { generateMeta } from "@/payload/utilities/generate-meta";
import config from "@payload-config";
import type { Metadata } from "next";
import { draftMode } from "next/headers";
import Image from "next/image";
import { getPayload } from "payload";
import { cache } from "react";

// pre-renders a subset of blog posts to optimize build performance and initial load speed
const generateStaticParams = async () => {
	const payload = await getPayload({ config });
	const posts = await payload.find({
		collection: "posts",
		draft: false,
		limit: 81,
		overrideAccess: false,
		pagination: false,
		select: { slug: true },
	});

	return posts.docs.map(({ slug }) => ({ slug }));
};

type Args = { params: Promise<{ slug?: string }> };

// retrieves post data with support for draft mode and request memoization
const queryPostBySlug = cache(async ({ slug }: { slug: string }) => {
	const { isEnabled: draft } = await draftMode();
	const payload = await getPayload({ config });
	const result = await payload.find({
		collection: "posts",
		draft,
		limit: 1,
		overrideAccess: draft,
		pagination: false,
		where: { slug: { equals: slug } },
	});

	return result.docs?.[0] || null;
});

// constructs seo metadata using the specific post content
const generateMetadata = async ({ params: paramsPromise }: Args): Promise<Metadata> => {
	const { slug = "" } = await paramsPromise;
	const post = await queryPostBySlug({ slug });
	return generateMeta({ doc: post });
};

// manages the post detail view including live preview and content rendering
const Page = async ({ params: paramsPromise }: Args) => {
	const { isEnabled: draft } = await draftMode();
	const { slug = "" } = await paramsPromise;
	const url = "/posts/" + slug;
	const post = await queryPostBySlug({ slug });

	// fallback to managed redirects if the requested post is unavailable
	if (!post) return <PayloadRedirects url={url} />;

	const { content, categories, heroImage, populatedAuthors, publishedAt, title } = post;
	const hasAuthors =
		populatedAuthors &&
		populatedAuthors.length > 0 &&
		formatAuthors(populatedAuthors) !== "";
	const image = heroImage;
	const imageSrc = typeof image === "string" ? image : (image?.url ?? "");
	const imageAlt = typeof image === "string" ? "" : (image?.alt ?? "");

	return (
		<section className="pt-24 pb-24">
			<Container>
				<PayloadRedirects disableNotFound url={url} />

				{/* synchronizes content state for real-time editor feedback */}
				{draft && <LivePreviewListener />}

				<div className="mx-auto max-w-5xl py-5">
					<div className="mb-6 flex flex-wrap gap-2 text-sm uppercase">
						{categories?.map((category, index) => {
							if (typeof category === "object" && category !== null) {
								const titleToUse = category.title || "Untitled category";
								return (
									<Badge key={index} variant="secondary">
										{titleToUse}
									</Badge>
								);
							}
							return null;
						})}
					</div>

					<h1 className="font-display text-text-default mb-6 text-4xl leading-tight font-bold text-balance md:text-5xl">
						{title}
					</h1>

					<div className="mb-6 flex flex-col gap-4 md:flex-row md:gap-16">
						{hasAuthors && (
							<div className="flex flex-col gap-4">
								<div className="flex flex-col gap-1">
									<p className="text-muted-foreground text-sm">Author</p>
									<p className="font-medium">{formatAuthors(populatedAuthors)}</p>
								</div>
							</div>
						)}
						{publishedAt && (
							<div className="flex flex-col gap-1">
								<p className="text-muted-foreground text-sm">Date Published</p>
								<time dateTime={publishedAt} className="font-medium">
									{formatDate(publishedAt)}
								</time>
							</div>
						)}
					</div>

					<div className="border-border bg-card relative mb-12 aspect-video w-full overflow-hidden rounded-2xl border shadow-md">
						<Image
							src={imageSrc}
							alt={imageAlt}
							fill
							priority
							className="object-cover"
							sizes="(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 1024px"
						/>
					</div>

					<RichText className="mx-auto max-w-4xl" data={content} enableGutter={false} />
				</div>
			</Container>
		</section>
	);
};

export { Page as default, generateStaticParams, generateMetadata };
