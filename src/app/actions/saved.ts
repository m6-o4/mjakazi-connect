"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { toggleSave } from "@/services/saved.service";

const toggleSaveSchema = z.object({
	mjakaziId: z.string().min(1),
});

// saves or unsaves a wajakazi profile for the signed-in mwajiri. the profile id
// is the only client input; identity and authorization come from the session
const toggleSaveAction = async (
	input: unknown,
): Promise<{ success: boolean; error?: string; saved?: boolean }> => {
	try {
		const parsed = toggleSaveSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Invalid request." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mwajiri") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await toggleSave(payload, user, parsed.data.mjakaziId);

		if (result.success) {
			revalidatePath("/dashboard/mwajiri/browse");
			revalidatePath("/dashboard/mwajiri/saved");
		}

		return {
			success: result.success,
			error: result.success ? undefined : result.error,
			saved: result.success ? result.data.saved : undefined,
		};
	} catch (error) {
		console.error("[actions/saved] toggleSave failed:", error);
		return { success: false, error: "Could not update saved wajakazi." };
	}
};

export { toggleSaveAction };
