"use client";

import { getClientSideURL } from "@/payload/utilities/get-url";
import { RefreshRouteOnSave as PayloadLivePreview } from "@payloadcms/live-preview-react";
import { useRouter } from "next/navigation";

/**
 * a client component that establishes the listener for payload's live preview feature.
 * it enables real-time updates on the next.js frontend whenever a document is saved in the payload admin.
 */
const LivePreviewListener = () => {
	// initializes the next.js router instance to enable soft route refreshes.
	const router = useRouter();

	return (
		// renders the payload live preview component to set up the connection.
		<PayloadLivePreview
			// passes the next.js router's refresh method to payload, allowing it to trigger
			// a soft data refresh of the current page without a full page reload when content is updated.
			refresh={router.refresh}
			// passes the base url of the next.js application to the payload component
			// so it knows the origin for content fetching.
			serverURL={getClientSideURL()}
		/>
	);
};

export { LivePreviewListener };
