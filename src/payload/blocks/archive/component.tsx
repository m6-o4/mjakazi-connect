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
	// destructure properties for easier access
	const {
		id,
		categories,
		introContent,
		limit: limitFromProps,
		populateBy,
		selectedDocs,
	} = props;

	// set the post limit, defaulting to 3 if the limit property is not provided
	const limit = limitFromProps || 3;

	let posts: Post[] = [];

	// check if posts should be fetched dynamically from the collection
	if (populateBy === "collection") {
		const payload = await getPayload({ config: config });

		// normalize category data: extract the id string from potentially populated category objects
		const flattenedCategories = categories?.map((category) => {
			if (typeof category === "object") return category.id;
			else return category;
		});

		// query the 'posts' collection
		const fetchedPosts = await payload.find({
			collection: "posts",
			depth: 1, // ensure related fields like categories are populated
			limit,
			// conditionally apply a 'where' filter if categories are selected
			...(flattenedCategories && flattenedCategories.length > 0
				? { where: { categories: { in: flattenedCategories } } }
				: {}),
		});

		posts = fetchedPosts.docs;
	} else {
		// if populateby is set to manual selection
		if (selectedDocs?.length) {
			// map the selected docs array to extract the populated post objects
			const filteredSelectedPosts = selectedDocs.map((post) => {
				if (typeof post.value === "object") return post.value;
			}) as Post[];

			posts = filteredSelectedPosts;
		}
	}

	return (
		<div className="bg-white px-4 py-20">
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
						{/* map over the final array of posts */}
						{posts.map((post) => {
							const image = post.meta?.image;

							const imageSrc =
								typeof image === "string" ? image : (image?.url ?? "/abstarct-image.jpg");

							const imageAlt =
								typeof image === "string" ? "Post image" : (image?.alt ?? "Post image");

							return (
								<Link key={post.id} href={`/posts/${post.slug}`}>
									<Card className="h-full cursor-pointer overflow-hidden bg-white p-0 shadow-lg transition-all duration-300 hover:shadow-xl">
										{/* image container */}
										<div className="relative h-64 w-full">
											<Image
												src={imageSrc}
												alt={imageAlt}
												fill
												className="object-cover"
											/>
										</div>
										<CardContent className="p-6">
											{/* published date, formatted by a utility function */}
											<p className="mb-3 text-sm font-semibold text-[#B2D2C2]">
												{formatDate(post.publishedAt)}
											</p>
											{/* post title */}
											<h3 className="mb-3 text-xl font-bold text-[#1A233D] transition-colors hover:text-[#49536C]">
												{post.title}
											</h3>
											{/* post excerpt/description */}
											<p className="leading-relaxed text-[#49536C]">
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
