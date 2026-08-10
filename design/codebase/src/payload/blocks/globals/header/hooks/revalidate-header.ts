import { revalidateTag } from "next/cache";
import type { GlobalAfterChangeHook } from "payload";

const revalidateHeader: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
	// triggers after the header global is updated to keep frontend navigation current
	if (!context.disableRevalidate) {
		// logs the event to track automated cache updates
		payload.logger.info(`revalidating header...`);

		// clears the specific cache tag for header data to force a fresh fetch on next request
		revalidateTag("global_header", "max");
	}

	return doc;
};

export { revalidateHeader };
