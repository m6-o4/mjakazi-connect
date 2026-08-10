import { getClientSideURL } from "@/payload/utilities/get-url";

// formats a media resource url and optionally appends a cache tag
const getMediaUrl = (
	url: string | null | undefined,
	cacheTag?: string | null,
): string => {
	// return empty string if url is invalid
	if (!url) return "";

	// encode cache tag if provided
	if (cacheTag && cacheTag !== "") {
		cacheTag = encodeURIComponent(cacheTag);
	}

	// return full url if it already includes a protocol
	if (url.startsWith("http://") || url.startsWith("https://")) {
		return cacheTag ? `${url}?${cacheTag}` : url;
	}

	// otherwise prepend the client-side base url
	const baseUrl = getClientSideURL();
	return cacheTag ? `${baseUrl}${url}?${cacheTag}` : `${baseUrl}${url}`;
};

export { getMediaUrl };
