import type { Page, Post } from "@/payload-types";
import { getCachedDocument } from "@/payload/utilities/get-document";
import { getCachedRedirects } from "@/payload/utilities/get-redirects";
import { notFound, redirect } from "next/navigation";

// props for the payloadredirects function.
interface Props {
	disableNotFound?: boolean;
	url: string;
}

// a server component function that intercepts requests to handle dynamic 301/302 redirects
// configured within payload cms. it checks the incoming url against cached rules and
// issues a next.js redirect if a match is found.
const PayloadRedirects = async ({ disableNotFound, url }: Props) => {
	const redirects = await getCachedRedirects()();

	// find the first redirect rule whose 'from' url matches the incoming url.
	const redirectItem = redirects.find((redirect) => redirect.from === url);

	if (redirectItem) {
		// 1. handle direct url redirects (to an external or hardcoded internal url).
		if (redirectItem.to?.url) {
			redirect(redirectItem.to.url);
		}

		let redirectUrl: string;

		// 2. handle redirects to an internal payload document (e.g., when reference is an id string).
		if (typeof redirectItem.to?.reference?.value === "string") {
			const collection = redirectItem.to?.reference?.relationTo;
			const id = redirectItem.to?.reference?.value;

			// fetch the target document to get its slug for the url.
			const document = (await getCachedDocument(collection, id)()) as Page | Post;

			// construct the redirect url: includes a collection prefix (e.g., /posts) unless it's a 'page',
			// followed by the document slug.
			redirectUrl = `${redirectItem.to?.reference?.relationTo !== "pages" ? `/${redirectItem.to?.reference?.relationTo}` : ""}/${
				document?.slug
			}`;
		} else {
			// 3. handle object-based reference (e.g., when the reference is already populated as an object).
			// this assumes the target document's slug is available in the object reference.
			redirectUrl = `${redirectItem.to?.reference?.relationTo !== "pages" ? `/${redirectItem.to?.reference?.relationTo}` : ""}/${
				typeof redirectItem.to?.reference?.value === "object"
					? redirectItem.to?.reference?.value?.slug
					: ""
			}`;
		}

		// if a valid internal url was constructed, execute the redirect.
		if (redirectUrl) redirect(redirectUrl);
	}

	// if no redirect rule was found, check the disable notfound flag.
	if (disableNotFound) {
		// if notfound is disabled, simply return null to allow the wrapper component to continue rendering.
		return null;
	}

	notFound();
};

export { PayloadRedirects };
