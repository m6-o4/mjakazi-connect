import { Media } from "@/payload-types";
import config from "@payload-config";
import Image from "next/image";
import { getPayload } from "payload";

/**
 * an asynchronous server component to fetch and render the organization's logo.
 * this component directly queries the 'branding' global collection for the media asset.
 */
const Logo = async () => {
	// initialize the payload instance to enable data fetching from the database.
	const payload = await getPayload({ config: config });

	// fetch the global branding settings document.
	const branding = await payload.findGlobal({ slug: "branding" });

	// cast the retrieved organization logo field to the specific media type for correct property access.
	const logo = branding.organizationLogo as Media;

	// checks if the required url exists on the media object before rendering.
	if (!logo?.url) return null;

	return (
		// react fragment is used as the root element to avoid unnecessary divs in the dom.
		<>
			<Image
				// use the logo's url from payload.
				src={logo.url}
				// use the logo's alt text from payload, falling back to 'logo' for accessibility.
				alt={logo.alt || "logo"}
				// specify fixed dimensions for consistent sizing.
				width={100}
				height={100}
				// set priority loading since the logo is a critical, above-the-fold element (lcp).
				priority
			/>
		</>
	);
};

export { Logo };
