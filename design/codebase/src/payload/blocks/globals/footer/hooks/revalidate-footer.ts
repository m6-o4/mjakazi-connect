import { revalidateTag } from "next/cache";
import type { GlobalAfterChangeHook } from "payload";

const revalidateFooter: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
	// triggers after the footer global is updated to keep frontend navigation current
	if (!context.disableRevalidate) {
		// logs the event to track automated cache updates
		payload.logger.info(`revalidating footer...`);

		// clears the specific cache tag for header data to force a fresh fetch on next request
		revalidateTag("global_footer", "max");
	}

	return doc;
};

export { revalidateFooter };
