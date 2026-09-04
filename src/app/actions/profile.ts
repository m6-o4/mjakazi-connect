"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { profileFormSchema, type ProfileFormValues } from "@/lib/profile-schema";
import config from "@/payload-config";
import { updateAvailability, updateProfile } from "@/services/profile.service";

type ActionResult = {
	success: boolean;
	profileComplete?: boolean;
	error?: string;
};

const availabilityStatusSchema = z.enum(["available", "hired", "on_break"]);

// saves the mjakazi's profile fields. the form already validates client-side;
// this re-validates server-side (the control) and delegates to the service
const updateProfileAction = async (input: ProfileFormValues): Promise<ActionResult> => {
	try {
		const parsed = profileFormSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Please check the highlighted fields." };
		}

		const user = await getCurrentUser();
		if (!user) {
			return { success: false, error: "You must be signed in." };
		}
		if (user.role !== "mjakazi") {
			return { success: false, error: "Forbidden." };
		}

		const payload = await getPayload({ config });
		const result = await updateProfile(payload, user, parsed.data);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		revalidatePath("/dashboard/mjakazi");
		revalidatePath("/dashboard/mjakazi/profile");

		return { success: true, profileComplete: result.data.profileComplete };
	} catch (error) {
		console.error("[actions/profile] updateProfile failed:", error);
		return { success: false, error: "Could not save your profile." };
	}
};

// flips the mjakazi's availability, which controls directory/archive visibility
const updateAvailabilityAction = async (status: string): Promise<ActionResult> => {
	try {
		const parsed = availabilityStatusSchema.safeParse(status);
		if (!parsed.success) {
			return { success: false, error: "Invalid availability status." };
		}

		const user = await getCurrentUser();
		if (!user) {
			return { success: false, error: "You must be signed in." };
		}
		if (user.role !== "mjakazi") {
			return { success: false, error: "Forbidden." };
		}

		const payload = await getPayload({ config });
		const result = await updateAvailability(payload, user, parsed.data);

		if (!result.success) {
			return { success: false, error: result.error };
		}

		revalidatePath("/dashboard/mjakazi");
		revalidatePath("/dashboard/mjakazi/settings");

		return { success: true };
	} catch (error) {
		console.error("[actions/profile] updateAvailability failed:", error);
		return { success: false, error: "Could not update your availability." };
	}
};

export { updateAvailabilityAction, updateProfileAction };
