"use server";

import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { revealContact } from "@/services/contact.service";

const revealContactSchema = z.object({
	mjakaziId: z.string().min(1),
});

type RevealContactResult = {
	success: boolean;
	error?: string;
	phone?: string | null;
	email?: string;
	tierAtUnlock?: string | null;
};

// unlocks a wajakazi's contact for the signed-in mwajiri. the profile id is the
// only client input; identity and authorization come from the session. the
// returned phone/email are only ever returned to the mwajiri who just unlocked
// them — the reveal is the deliverable, not a leak
const revealContactAction = async (input: unknown): Promise<RevealContactResult> => {
	try {
		const parsed = revealContactSchema.safeParse(input);
		if (!parsed.success) return { success: false, error: "Invalid request." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mwajiri") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await revealContact(payload, user, parsed.data.mjakaziId);

		if (!result.success) return { success: false, error: result.error };

		return {
			success: true,
			phone: result.data.phone,
			email: result.data.email,
			tierAtUnlock: result.data.tierAtUnlock,
		};
	} catch (error) {
		console.error("[actions/contact] revealContact failed:", error);
		return { success: false, error: "Could not unlock contact details." };
	}
};

export { revealContactAction };
