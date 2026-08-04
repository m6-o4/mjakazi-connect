import { revalidateTag } from "next/cache";
import type { GlobalAfterChangeHook } from "payload";

const revalidateFooter: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
	// triggers after the footer global is updated to keep frontend navigation current
	if (!context.disableRevalidate) {
		payload.logger.info(`revalidating footer...`);

		revalidateTag("global_footer", "max");
	}

	return doc;
};

export { revalidateFooter };
