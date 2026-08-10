import { draftMode } from "next/headers";

/**
 * next.js api route handler for explicitly disabling draft mode (live preview).
 * this endpoint clears the preview cookies, forcing the site to fetch only published content.
 */
export async function GET(): Promise<Response> {
	// access the next.js draft mode utility from the headers object.
	const draft = await draftMode();

	// disable next.js draft mode, which clears the session cookie used for previewing drafts.
	draft.disable();

	// return a simple confirmation response to the client.
	return new Response("draft mode is disabled.");
}
