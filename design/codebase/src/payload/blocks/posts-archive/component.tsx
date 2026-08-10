import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import type { Post, PostsArchive } from "@/payload-types";
import { formatDate } from "@/payload/utilities/format-date";
import config from "@payload-config";
import { ArrowRight, FileCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { getPayload } from "payload";

type PostsArchiveBlockProps = PostsArchive & { id?: string };

// maps background variants to tailwind classes
const bgMap: Record<string, string> = { subtle: "bg-bg-subtle", white: "bg-bg-white" };

const PostsArchiveBlock = async (props: PostsArchiveBlockProps) => {
	const {
		id,
		backgroundVariant = "subtle",
		categories,
		headline,
		headlineDescription,
		limit: limitFromProps,
		populateBy,
		selectedDocs,
	} = props;
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-bg-subtle";
	const limit = limitFromProps || 3;

	let posts: Post[] = [];

	if (populateBy === "collection") {
		const payload = await getPayload({ config: config });

		// extract category ids to filter posts
		const flattenedCategories = categories?.map((category) => {
			if (typeof category === "object") return category.id;
			else return category;
		});

		// fetch posts from the collection with optional category filtering
		const fetchedPosts = await payload.find({
			collection: "posts",
			limit,
			...(flattenedCategories && flattenedCategories.length > 0
				? { where: { categories: { in: flattenedCategories } } }
				: {}),
		});

		posts = fetchedPosts.docs;
	} else {
		// use manually selected posts if populateBy is selection
		if (selectedDocs?.length) {
			const filteredSelectedPosts = selectedDocs.map((post) => {
				if (typeof post.value === "object") return post.value;
			}) as Post[];

			posts = filteredSelectedPosts;
		}
	}

	return (
		<div className={cn("px-4 py-20", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="px-3" id={`block-${id}`}>
					{/* render headline and description if present */}
					{(headline || headlineDescription) && (
						<div className="mb-12 flex flex-col items-end justify-between md:flex-row">
							<div>
								{headline && (
									<h2 className="font-display text-text-default mb-4 text-3xl font-bold md:text-4xl">
										{headline}
									</h2>
								)}
								{headlineDescription && (
									<p className="text-muted-foreground">{headlineDescription}</p>
								)}
							</div>
							<Link
								href="/posts"
								className="border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10 mt-6 hidden items-center justify-center rounded-lg border px-6 py-3 font-medium transition-all duration-200 md:mt-0 md:inline-flex"
							>
								View All Articles <ArrowRight className="ml-2 h-4 w-4" />
							</Link>
						</div>
					)}

					<div className="grid gap-8 md:grid-cols-3">
						{posts.map((post) => {
							const image = post.meta?.image;
							// resolve image url or fallback
							const imageSrc =
								typeof image === "string"
									? image
									: (image?.url ?? "/mjakazi-connect.png");
							const imageAlt =
								typeof image === "string" ? "Post image" : (image?.alt ?? "Post image");

							// resolve category title or fallback
							const category =
								post.categories &&
								post.categories.length > 0 &&
								typeof post.categories[0] !== "string"
									? post.categories[0].title
									: "Uncategorized";

							return (
								<Link key={post.id} href={`/posts/${post.slug}`}>
									<article className="group border-border-subtle bg-card hover:border-brand-primary/20 flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-lg">
										<div className="bg-muted relative aspect-16/10 overflow-hidden">
											{imageSrc ? (
												<>
													<Image
														src={imageSrc}
														alt={imageAlt}
														fill
														className="object-cover transition-transform duration-500 group-hover:scale-105"
													/>
													<div className="bg-brand-primary/10 absolute inset-0 transition-colors duration-300 group-hover:bg-transparent" />
												</>
											) : (
												<>
													{/* fallback placeholder if no image exists */}
													<div className="bg-brand-primary/10 absolute inset-0 transition-colors duration-300 group-hover:bg-transparent"></div>
													<div className="from-brand-primary/10 to-brand-primary-light/20 flex h-full w-full items-center justify-center bg-linear-to-br">
														<FileCheck className="text-muted-foreground/30 size-12 transition-transform duration-500 group-hover:scale-110" />
													</div>
												</>
											)}
											<div className="absolute top-4 left-4">
												<span className="border-border-subtle bg-card text-muted-foreground inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
													{category}
												</span>
											</div>
										</div>
										<div className="flex flex-1 flex-col p-6">
											<div className="text-muted-foreground mb-3 flex items-center space-x-2 text-xs">
												<span>{formatDate(post.publishedAt)}</span>
											</div>
											<h3 className="font-display text-text-default group-hover:text-brand-primary mb-3 text-xl font-bold transition-colors">
												{post.title}
											</h3>
											<p className="text-muted-foreground mb-4 line-clamp-4 text-sm leading-relaxed">
												{post.meta?.description}
											</p>
										</div>
									</article>
								</Link>
							);
						})}
					</div>
				</div>
			</Container>
		</div>
	);
};

export { PostsArchiveBlock };
