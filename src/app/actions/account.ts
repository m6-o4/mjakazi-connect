"use server";

import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { deleteOwnAccount } from "@/services/accounts.service";

type ActionResult = {
	success: boolean;
	error?: string;
	code?: string;
};

// the authenticated mjakazi/mwajiri deletes their own account. the service
// performs the cascade (profile, documents, photo, subscription, payments) and
// deletes the payload user, whose afterDelete hook removes the clerk identity
const deleteOwnAccountAction = async (): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) {
			return { success: false, error: "You must be signed in." };
		}
		if (user.role !== "mjakazi" && user.role !== "mwajiri") {
			return { success: false, error: "Forbidden." };
		}

		const payload = await getPayload({ config });
		const result = await deleteOwnAccount(payload, user);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		return { success: true };
	} catch (error) {
		console.error("[actions/account] deleteOwnAccount failed:", error);
		return { success: false, error: "Could not delete your account." };
	}
};

export { deleteOwnAccountAction };
