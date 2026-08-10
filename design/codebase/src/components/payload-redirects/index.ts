import type { Page, Post } from "@/payload-types";
import { getCachedDocument } from "@/payload/utilities/get-document";
import { getCachedRedirects } from "@/payload/utilities/get-redirects";
import { notFound, redirect } from "next/navigation";

// props for the PayloadRedirects function
interface Props {
	disableNotFound?: boolean;
	url: string;
}

/* this function handles server-side dynamic redirects based on payload cms data. */
const PayloadRedirects = async ({ disableNotFound, url }: Props) => {
	const redirects = await getCachedRedirects()();

	const redirectItem = redirects.find((redirect) => redirect.from === url);

	if (redirectItem) {
		// 1. handle direct url redirects
		if (redirectItem.to?.url) {
			redirect(redirectItem.to.url);
		}

		let redirectUrl: string;

		// 2. handle redirects to an internal payload document
		if (typeof redirectItem.to?.reference?.value === "string") {
			const collection = redirectItem.to?.reference?.relationTo;
			const id = redirectItem.to?.reference?.value;

			const document = (await getCachedDocument(collection, id)()) as Page | Post;

			// build the url: conditional prefix (e.g., /posts) + slug
			redirectUrl = `${redirectItem.to?.reference?.relationTo !== "pages" ? `/${redirectItem.to?.reference?.relationTo}` : ""}/${
				document?.slug
			}`;
		} else {
			// 3. handle object-based reference (e.g., when the reference is an object due to population)
			redirectUrl = `${redirectItem.to?.reference?.relationTo !== "pages" ? `/${redirectItem.to?.reference?.relationTo}` : ""}/${
				typeof redirectItem.to?.reference?.value === "object"
					? redirectItem.to?.reference?.value?.slug
					: ""
			}`;
		}

		if (redirectUrl) redirect(redirectUrl);
	}

	// if no redirect is found and notFound is disabled, return null (important for wrapping components)
	if (disableNotFound) return null;

	// if no redirect is found, trigger a Next.js notFound page
	notFound();
};

export { PayloadRedirects };
