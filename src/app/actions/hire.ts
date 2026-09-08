"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import {
	confirmHire,
	confirmHireByMjakazi,
	endHire,
	reverseHire,
} from "@/services/hire.service";

type ActionResult = { success: boolean; error?: string; code?: string };

const confirmHireSchema = z.object({
	mjakaziId: z.string().min(1),
	sourceEoiId: z.string().min(1).nullable().optional(),
});

const confirmHireByMjakaziSchema = z.object({
	mwajiriId: z.string().min(1),
});

const reverseHireSchema = z.object({
	hireId: z.string().min(1),
});

const endHireSchema = z.object({
	hireId: z.string().min(1),
});

// mwajiri side — marks a hire with a wajakazi, or agrees to one the wajakazi
// already confirmed. the profile id is the only client input; identity, the
// counterpart and the state machine all resolve server-side
const confirmHireAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = confirmHireSchema.safeParse(input);
		if (!parsed.success) return { success: false, error: "Invalid hire." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mwajiri") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await confirmHire(
			payload,
			user,
			parsed.data.mjakaziId,
			parsed.data.sourceEoiId ?? null,
		);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mwajiri");

		return { success: true };
	} catch (error) {
		console.error("[actions/hire] confirmHire failed:", error);
		return { success: false, error: "Could not confirm the hire." };
	}
};

// mjakazi side — confirms a hire with a mwajiri chosen from the "who hired you"
// picker. the mwajiri id is the only client input
const confirmHireByMjakaziAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = confirmHireByMjakaziSchema.safeParse(input);
		if (!parsed.success) return { success: false, error: "Invalid hire." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mjakazi") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await confirmHireByMjakazi(payload, user, parsed.data.mwajiriId);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mjakazi");
		revalidatePath("/dashboard/mjakazi/settings");

		return { success: true };
	} catch (error) {
		console.error("[actions/hire] confirmHireByMjakazi failed:", error);
		return { success: false, error: "Could not confirm the hire." };
	}
};

// either party reverses an active hire they are part of
const reverseHireAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = reverseHireSchema.safeParse(input);
		if (!parsed.success) return { success: false, error: "Invalid hire." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };

		const payload = await getPayload({ config });
		const result = await reverseHire(payload, user, parsed.data.hireId);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mwajiri");
		revalidatePath("/dashboard/mjakazi");
		revalidatePath("/dashboard/mjakazi/settings");

		return { success: true };
	} catch (error) {
		console.error("[actions/hire] reverseHire failed:", error);
		return { success: false, error: "Could not reverse the hire." };
	}
};

// either party ends a completed contract — releases the mjakazi and, for the
// mwajiri, opens the door to a review
const endHireAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = endHireSchema.safeParse(input);
		if (!parsed.success) return { success: false, error: "Invalid hire." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mwajiri" && user.role !== "mjakazi") {
			return { success: false, error: "Forbidden." };
		}

		const payload = await getPayload({ config });
		const result = await endHire(payload, user, parsed.data.hireId);

		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mwajiri");
		revalidatePath("/dashboard/mjakazi");
		revalidatePath("/dashboard/mjakazi/settings");

		return { success: true };
	} catch (error) {
		console.error("[actions/hire] endHire failed:", error);
		return { success: false, error: "Could not end the contract." };
	}
};

export {
	confirmHireAction,
	confirmHireByMjakaziAction,
	endHireAction,
	reverseHireAction,
};
