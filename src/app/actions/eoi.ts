"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { respondToEoi, sendEoiBatch } from "@/services/eoi.service";

type ActionResult = { success: boolean; error?: string; code?: string };

// shape check only — the batch bounds come from the policy in platform-settings
// and are enforced in the service, which is the single source of truth
const sendEoiBatchSchema = z.object({
	mjakaziIds: z.array(z.string().min(1)).min(1),
});

const respondToEoiSchema = z.object({
	eoiId: z.string().min(1),
	response: z.enum(["accepted", "rejected"]),
});

// sends a batch of expressions of interest. the profile ids are the only client
// input; identity, the batch bounds, the active-subscription check, the gate, the
// cooldown and the directory-visibility check all happen server-side in the service
const sendEoiBatchAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = sendEoiBatchSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Select at least one mjakazi." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mwajiri") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await sendEoiBatch(payload, user, parsed.data.mjakaziIds);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mwajiri/saved");
		revalidatePath("/dashboard/mwajiri/browse");
		revalidatePath("/dashboard/mwajiri");

		return { success: true };
	} catch (error) {
		console.error("[actions/eoi] sendEoiBatch failed:", error);
		return { success: false, error: "Could not send your interest." };
	}
};

// accepts or rejects a received expression of interest. the eoi id is the only
// client input; ownership and the sent-state check happen in the service
const respondToEoiAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = respondToEoiSchema.safeParse(input);
		if (!parsed.success) return { success: false, error: "Invalid response." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mjakazi") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await respondToEoi(
			payload,
			user,
			parsed.data.eoiId,
			parsed.data.response,
		);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mjakazi/opportunities");

		return { success: true };
	} catch (error) {
		console.error("[actions/eoi] respondToEoi failed:", error);
		return { success: false, error: "Could not respond to this interest." };
	}
};

export { respondToEoiAction, sendEoiBatchAction };
