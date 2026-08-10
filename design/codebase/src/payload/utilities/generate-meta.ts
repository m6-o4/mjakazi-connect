import type { Config, Media, Page, Post } from "@/payload-types";
import { getServerSideURL } from "@/payload/utilities/get-url";
import { mergeOpenGraph } from "@/payload/utilities/merge-opengraph";
import type { Metadata } from "next";

// builds the absolute url for an open graph image using either
// the document's provided meta image or a default template image
const getImageURL = (image?: Media | Config["db"]["defaultIDType"] | null) => {
	const serverUrl = getServerSideURL();

	// default image used when no meta image is defined
	let url = serverUrl + "/mjakazi-connect.png";

	// if a media object is provided, use its og or base url
	if (image && typeof image === "object" && "url" in image) {
		url = serverUrl + image.url;
	}

	return url;
};

// builds the metadata object for a next.js page or post document,
// including title, description, and open graph information
const generateMeta = async (args: {
	doc: Partial<Page> | Partial<Post> | null;
}): Promise<Metadata> => {
	const { doc } = args;

	// resolve og image url from the document
	const ogImage = getImageURL(doc?.meta?.image);

	// append site name to meta title if available
	const title = doc?.meta?.title
		? doc.meta.title + " | Mjakazi Connect"
		: "Mjakazi Connect";

	// compose and return metadata object
	return {
		description: doc?.meta?.description,
		openGraph: mergeOpenGraph({
			description: doc?.meta?.description || "",
			images: ogImage ? [{ url: ogImage }] : undefined,
			title,
			// construct a url-friendly slug path if the slug is an array
			url: Array.isArray(doc?.slug) ? doc.slug.join("/") : "/",
		}),
		title,
	};
};

export { getImageURL, generateMeta };
