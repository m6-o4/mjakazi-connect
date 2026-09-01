"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { updateSubscriptionTiers, updateVerificationFee } from "@/services/settings.service";

type ActionResult = { success: boolean; error?: string; code?: string };

// shape check only — value validation (finite, >= 1, unique tierId) lives in the
// service, which is the single source of truth for what a valid tier/fee is
const tierSchema = z.object({
	tierId: z.string(),
	name: z.string(),
	price: z.number(),
	durationDays: z.number(),
	description: z.string().nullish(),
	isActive: z.boolean(),
	isConcierge: z.boolean(),
});

const tiersSchema = z.array(tierSchema).min(1);

const updateVerificationFeeAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = z.number().safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Enter a fee of at least KSh 1." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "admin") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await updateVerificationFee(payload, user, parsed.data);
		if (!result.success) return { success: false, error: result.error, code: result.code };

		revalidatePath("/dashboard/admin/settings");
		return { success: true };
	} catch (error) {
		console.error("[actions/settings] updateVerificationFee failed:", error);
		return { success: false, error: "Could not save the fee." };
	}
};

const updateSubscriptionTiersAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = tiersSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Please check the tier fields." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "admin") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await updateSubscriptionTiers(payload, user, parsed.data);
		if (!result.success) return { success: false, error: result.error, code: result.code };

		revalidatePath("/dashboard/admin/settings");
		return { success: true };
	} catch (error) {
		console.error("[actions/settings] updateSubscriptionTiers failed:", error);
		return { success: false, error: "Could not save the tiers." };
	}
};

export { updateSubscriptionTiersAction, updateVerificationFeeAction };
