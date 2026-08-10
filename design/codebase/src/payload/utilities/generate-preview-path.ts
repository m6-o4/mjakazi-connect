import type { CollectionSlug, PayloadRequest } from "payload";

// maps each collection to its url prefix used for preview routing
const collectionPrefixMap: Partial<Record<CollectionSlug, string>> = {
	posts: "/posts",
	pages: "",
};

type Props = {
	collection: keyof typeof collectionPrefixMap;
	slug: string;
	req: PayloadRequest;
};

// builds a next.js draft mode (preview mode) path for a payload document
const generatePreviewPath = ({ collection, slug }: Props) => {
	// determine the base path from the collection mapping
	const path = collectionPrefixMap[collection];

	// encode all required query parameters for preview mode
	const encodedParams = new URLSearchParams({
		slug,
		collection,
		path: `${path}/${slug}`,
		previewSecret: process.env.PREVIEW_SECRET!,
	});

	// construct final preview url
	const url = `/next/preview?${encodedParams.toString()}`;

	return url;
};

export { generatePreviewPath };
