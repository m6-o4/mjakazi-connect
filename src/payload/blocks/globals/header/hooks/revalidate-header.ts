import { revalidateTag } from "next/cache";
import type { GlobalAfterChangeHook } from "payload";

const revalidateHeader: GlobalAfterChangeHook = ({ doc, req: { payload, context } }) => {
	// triggers after the header global is updated to keep frontend navigation current
	if (!context.disableRevalidate) {
		payload.logger.info(`revalidating header...`);

		revalidateTag("global_header", "max");
	}

	return doc;
};

export { revalidateHeader };
