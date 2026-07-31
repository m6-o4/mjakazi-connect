"use client";

import { getClientSideURL } from "@/payload/utilities/get-url";
import { RefreshRouteOnSave as PayloadLivePreview } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

// a client component that establishes the listener for payload's live preview feature.
// it enables real-time updates on the next.js frontend whenever a document is saved in
// the payload admin.
const LivePreviewListener = () => {
	const router = useRouter();

	return <PayloadLivePreview refresh={router.refresh} serverURL={getClientSideURL()} />;
};

export { LivePreviewListener };
