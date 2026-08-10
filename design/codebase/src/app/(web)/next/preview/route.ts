import config from "@payload-config";
import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { getPayload } from "payload";
import type { CollectionSlug, PayloadRequest } from "payload";

/**
 * next.js api route handler for enabling draft mode (live preview).
 * this endpoint is called by payload cms to start a live preview session,
 * performing authentication and security checks before enabling next.js draft mode.
 */
export async function GET(req: NextRequest): Promise<Response> {
	// initialize payload to access authentication and database functionality.
	const payload = await getPayload({ config: config });

	// extract necessary parameters from the request url for validation and redirection.
	const { searchParams } = new URL(req.url);

	// the relative path to redirect to after enabling draft mode (e.g., '/about-us').
	const path = searchParams.get("path");

	// the collection slug of the document being previewed (e.g., 'pages').
	const collection = searchParams.get("collection") as CollectionSlug;

	// the slug of the document being previewed.
	const slug = searchParams.get("slug");

	// a secret token used for basic security verification against environment variables.
	const previewSecret = searchParams.get("previewSecret");

	// security check 1: reject the request if the provided secret does not match the environment secret.
	if (previewSecret !== process.env.PREVIEW_SECRET) {
		return new Response("you are not allowed to preview this page.", { status: 403 });
	}

	// validation check: ensure all required parameters were passed.
	if (!path || !collection || !slug) {
		return new Response("insufficient search params.", { status: 404 });
	}

	// validation check: ensure the target path is a relative path starting with '/'.
	if (!path.startsWith("/")) {
		return new Response("this endpoint can only be used for relative previews.", {
			status: 500,
		});
	}

	let user;

	// attempt to authenticate the user using the payload token in the cookies/headers.
	try {
		user = await payload.auth({
			// cast nextrequest to payloadrequest to ensure compatibility with payload's authentication utility.
			req: req as unknown as PayloadRequest,
			headers: req.headers,
		});
	} catch (error) {
		// log any errors during the authentication token verification process.
		payload.logger.error({ err: error }, "error verifying token for live preview.");
		return new Response("you are not allowed to preview this page.", { status: 403 });
	}

	// access next.js draft mode utility to control caching behavior.
	const draft = await draftMode();

	// if user authentication failed, disable draft mode (in case it was already active) and deny access.
	if (!user) {
		draft.disable();
		return new Response("you are not allowed to preview this page.", { status: 403 });
	}

	// all security and validation checks passed, proceed to enable next.js draft mode.
	draft.enable();

	// redirect the user to the content path. next.js will now render the latest draft version.
	redirect(path);
}
