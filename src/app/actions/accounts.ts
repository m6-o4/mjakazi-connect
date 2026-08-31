"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { deleteAccount, updateAccountName } from "@/services/accounts.service";

type ActionResult = { success: boolean; error?: string };

const nameSchema = z.object({
	firstName: z.string().trim().min(1, { error: "First name is required." }),
	lastName: z.string().trim(),
});

const updateAccountAction = async (
	userId: string,
	input: unknown,
): Promise<ActionResult> => {
	try {
		const parsed = nameSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Please check the form fields." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };

		const payload = await getPayload({ config });
		const result = await updateAccountName(payload, user, userId, parsed.data);
		if (!result.success) return { success: false, error: result.error };

		revalidatePath("/dashboard/accounts/wajakazi");
		revalidatePath("/dashboard/accounts/waajiri");
		return { success: true };
	} catch (error) {
		console.error("[actions/accounts] updateAccount failed:", error);
		return { success: false, error: "Could not update the account." };
	}
};

const deleteAccountAction = async (userId: string): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };

		const payload = await getPayload({ config });
		const result = await deleteAccount(payload, user, userId);
		if (!result.success) return { success: false, error: result.error };

		revalidatePath("/dashboard/accounts/wajakazi");
		revalidatePath("/dashboard/accounts/waajiri");
		return { success: true };
	} catch (error) {
		console.error("[actions/accounts] deleteAccount failed:", error);
		return { success: false, error: "Could not delete the account." };
	}
};

export { deleteAccountAction, updateAccountAction };
