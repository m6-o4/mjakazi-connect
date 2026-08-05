import Image from "next/image";
import Link from "next/link";
import config from "@/payload-config";
import { getPayload } from "payload";
import { Card, CardContent } from "@/components/ui/card";
import { RichText } from "@/components/payload/rich-text";
import { formatDate } from "@/payload/utilities/format-date";
import type { Post, Archive } from "@/payload-types";

// combine the base archive type with an optional id for block identification
type ArchiveBlockProps = Archive & { id?: string };

const ArchiveBlock = async (props: ArchiveBlockProps) => {
	const {
		id,
		categories,
		introContent,
		limit: limitFromProps,
		populateBy,
		selectedDocs,
	} = props;

	const limit = limitFromProps || 3;

	let posts: Post[] = [];

	if (populateBy === "collection") {
		const payload = await getPayload({ config: config });

		const flattenedCategories = categories?.map((category) => {
			if (typeof category === "object") return category.id;
			else return category;
		});

		const fetchedPosts = await payload.find({
			collection: "posts",
			depth: 1,
			limit,
			...(flattenedCategories && flattenedCategories.length > 0
				? { where: { categories: { in: flattenedCategories } } }
				: {}),
		});

		posts = fetchedPosts.docs;
	} else {
		if (selectedDocs?.length) {
			const filteredSelectedPosts = selectedDocs.map((post) => {
				if (typeof post.value === "object") return post.value;
			}) as Post[];

			posts = filteredSelectedPosts;
		}
	}

	return (
		<div className="bg-background px-4 py-20">
			<div className="mx-auto max-w-6xl">
				<div className="px-3" id={`block-${id}`}>
					{introContent && (
						<RichText
							className="mx-auto mb-6 max-w-200"
							data={introContent}
							enableGutter={false}
						/>
					)}

					{/* responsive grid container for the post cards */}
					<div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
						{posts.map((post) => {
							const image = post.meta?.image;

							const imageSrc =
								typeof image === "string"
									? image
									: (image?.url ?? "/mjakazi-connect.png");

							const imageAlt =
								typeof image === "string" ? "Post image" : (image?.alt ?? "Post image");

							return (
								<Link key={post.id} href={`/posts/${post.slug}`}>
									<Card className="bg-card h-full cursor-pointer overflow-hidden p-0 shadow-lg transition-all duration-300 hover:shadow-xl">
										<div className="relative h-64 w-full">
											<Image
												src={imageSrc}
												alt={imageAlt}
												fill
												className="object-cover"
											/>
										</div>
										<CardContent className="p-6">
											<p className="text-muted-foreground mb-3 text-sm font-semibold">
												{formatDate(post.publishedAt)}
											</p>
											<h3 className="text-heading hover:text-muted-foreground mb-3 text-xl font-semibold transition-colors">
												{post.title}
											</h3>
											<p className="text-muted-foreground leading-relaxed">
												{post.meta?.description}
											</p>
										</CardContent>
									</Card>
								</Link>
							);
						})}
					</div>
				</div>
			</div>
		</div>
	);
};

export { ArchiveBlock };
