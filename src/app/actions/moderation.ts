"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { reinstateAccount, suspendAccount } from "@/services/moderation.service";

type ActionResult = { success: boolean; error?: string };

const reasonSchema = z.string().trim().min(1, "A reason is required.");

const suspendAccountAction = async (
	userId: string,
	reason: string,
): Promise<ActionResult> => {
	try {
		const parsed = reasonSchema.safeParse(reason);
		if (!parsed.success) return { success: false, error: "A reason is required." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };

		const payload = await getPayload({ config });
		const result = await suspendAccount(payload, user, userId, parsed.data);
		if (!result.success) return { success: false, error: result.error };

		revalidatePath("/dashboard/moderation");
		return { success: true };
	} catch (error) {
		console.error("[actions/moderation] suspendAccount failed:", error);
		return { success: false, error: "Could not suspend the account." };
	}
};

const reinstateAccountAction = async (
	userId: string,
	reason: string,
): Promise<ActionResult> => {
	try {
		const parsed = reasonSchema.safeParse(reason);
		if (!parsed.success) return { success: false, error: "A reason is required." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };

		const payload = await getPayload({ config });
		const result = await reinstateAccount(payload, user, userId, parsed.data);
		if (!result.success) return { success: false, error: result.error };

		revalidatePath("/dashboard/moderation");
		return { success: true };
	} catch (error) {
		console.error("[actions/moderation] reinstateAccount failed:", error);
		return { success: false, error: "Could not reinstate the account." };
	}
};

export { reinstateAccountAction, suspendAccountAction };
