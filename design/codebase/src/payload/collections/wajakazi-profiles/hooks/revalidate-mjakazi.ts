import { revalidatePath } from "next/cache";
import type { CollectionAfterChangeHook } from "payload";

// fires after any mjakazi profile is created or updated
// triggers a next.js revalidation of the marketing home page
// so the wajakazi archive block reflects current verified profiles without a redeploy
const revalidateMjakazi: CollectionAfterChangeHook = async ({ doc, req }) => {
	// only revalidate when the profile is verified and complete — these are the ones shown on the marketing page
	if (doc.verificationStatus === "verified" && doc.profileComplete === true) {
		req.payload.logger.info(`Revalidating / after profile ${doc.id} update.`);
		revalidatePath("/");
	}

	return doc;
};

export { revalidateMjakazi };
