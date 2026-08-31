"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import config from "@/payload-config";
import { createStaff, deleteStaff, updateStaff } from "@/services/staff.service";

type ActionResult = { success: boolean; error?: string };

const staffInputSchema = z.object({
	firstName: z.string().trim().min(1, { error: "First name is required." }),
	lastName: z.string().trim(),
	email: z.string().trim().email({ error: "Enter a valid email address." }),
});

const nameSchema = z.object({
	firstName: z.string().trim().min(1, { error: "First name is required." }),
	lastName: z.string().trim(),
});

const createStaffAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = staffInputSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Please check the form fields." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "admin") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await createStaff(payload, user, parsed.data);
		if (!result.success) return { success: false, error: result.error };

		revalidatePath("/dashboard/admin/staff");
		return { success: true };
	} catch (error) {
		console.error("[actions/staff] createStaff failed:", error);
		return { success: false, error: "Could not create the staff account." };
	}
};

const updateStaffAction = async (
	staffId: string,
	input: unknown,
): Promise<ActionResult> => {
	try {
		const parsed = nameSchema.safeParse(input);
		if (!parsed.success) {
			return { success: false, error: "Please check the form fields." };
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "admin") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await updateStaff(payload, user, staffId, parsed.data);
		if (!result.success) return { success: false, error: result.error };

		revalidatePath("/dashboard/admin/staff");
		return { success: true };
	} catch (error) {
		console.error("[actions/staff] updateStaff failed:", error);
		return { success: false, error: "Could not update the staff account." };
	}
};

const deleteStaffAction = async (staffId: string): Promise<ActionResult> => {
	try {
		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "admin") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await deleteStaff(payload, user, staffId);
		if (!result.success) return { success: false, error: result.error };

		revalidatePath("/dashboard/admin/staff");
		return { success: true };
	} catch (error) {
		console.error("[actions/staff] deleteStaff failed:", error);
		return { success: false, error: "Could not delete the staff account." };
	}
};

export { createStaffAction, deleteStaffAction, updateStaffAction };
