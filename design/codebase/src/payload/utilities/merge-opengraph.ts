import { getServerSideURL } from "@/payload/utilities/get-url";
import type { Metadata } from "next";

// default open graph metadata used across pages
const defaultOpenGraph: Metadata["openGraph"] = {
	type: "website",
	description:
		"Kenya's premier high-trust digital bureau for domestic help. Find and hire verified wajakazi through our secure, document-backed platform. NDPA-compliant vetting including National ID and Certificate of Good Conduct checks.",
	images: [{ url: `${getServerSideURL()}/mjakazi-connect.png` }],
	siteName: "Mjakazi Connect",
	title: "Mjakazi Connect",
};

// merges provided open graph data with defaults to ensure required fields exist
const mergeOpenGraph = (og?: Metadata["openGraph"]): Metadata["openGraph"] => {
	return {
		...defaultOpenGraph,
		...og,
		// keep custom images if provided, otherwise use default ones
		images: og?.images ? og.images : defaultOpenGraph.images,
	};
};

export { mergeOpenGraph };
