import { Media } from "@/payload-types";
import config from "@payload-config";
import Image from "next/image";
import { getPayload } from "payload";

/**
 * an asynchronous server component to fetch and render the organization's icon.
 * this component fetches data directly from the 'branding' global collection in payload.
 */
const Icon = async () => {
	// initialize the payload instance to access the database.
	const payload = await getPayload({ config: config });

	// fetch the global branding settings to retrieve the icon asset.
	const branding = await payload.findGlobal({ slug: "branding" });

	// cast the organization icon field to the specific media type for correct prop access.
	const icon = branding.organizationIcon as Media;

	// checks if the required url exists on the media object before rendering.
	if (!icon?.url) return null;

	return (
		// react fragment is used as the root element for cleaner output in the dom.
		<>
			<Image
				// use the icon's url from payload, defaulting to an empty string if missing.
				src={icon.url}
				// use the icon's alt text from payload, falling back to 'icon' for accessibility.
				alt={icon.alt || "icon"}
				// specify fixed dimensions for the icon to prevent layout shift (cls).
				width={32}
				height={32}
				// set priority loading since this is likely a critical element (lcp).
				priority
			/>
		</>
	);
};

export { Icon };
