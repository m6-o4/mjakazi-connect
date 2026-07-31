import { draftMode } from "next/headers";

// next.js api route handler for explicitly disabling draft mode (live preview).
// this endpoint clears the preview cookies, forcing the site to fetch only published content.
export async function GET(): Promise<Response> {
	const draft = await draftMode();

	draft.disable();

	return new Response("draft mode is disabled.");
}
