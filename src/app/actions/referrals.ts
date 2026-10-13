"use server";

import { revalidatePath } from "next/cache";
import { getPayload } from "payload";
import { z } from "zod";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { JOB_OPTIONS, type JobValue } from "@/lib/profile-constants";
import { REFERRAL_NOTE_MAX_LENGTH } from "@/lib/referral";
import config from "@/payload-config";
import {
	inviteReferrer,
	publishReferral,
	rejectReferral,
	submitReferral,
	withdrawInvite,
} from "@/services/referral.service";

type ActionResult = { success: boolean; error?: string; code?: string };

const isBackOffice = (user: { role: string }): boolean =>
	user.role === "admin" || user.role === "staff";

const jobValues = JOB_OPTIONS.map((option) => option.value) as [JobValue, ...JobValue[]];
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date.");
const rejectionReasonSchema = z.string().trim().min(1, "A rejection reason is required.");

const inviteSchema = z.object({
	referrerName: z.string().trim().min(1, "Enter the employer's name.").max(120),
	referrerEmail: z.string().trim().email("Enter a valid email address.").max(200),
	role: z.enum(jobValues),
	startDate: dateOnly,
	endDate: dateOnly,
});

const submitSchema = z.object({
	token: z.string().trim().min(1),
	referrerName: z.string().trim().min(1, "Enter your name.").max(120),
	role: z.enum(jobValues),
	startDate: dateOnly,
	endDate: dateOnly,
	note: z.string().trim().min(1, "Write a short referral.").max(REFERRAL_NOTE_MAX_LENGTH),
});

// a mjakazi invites a former employer. the policy checks (cap, one per employer,
// cooldown), the token and the email all live in the service; this only
// authenticates, authorizes, validates and delegates
const inviteReferrerAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = inviteSchema.safeParse(input);
		if (!parsed.success) {
			return {
				success: false,
				error: parsed.error.issues[0]?.message ?? "Check the details and try again.",
			};
		}

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mjakazi") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await inviteReferrer(payload, user, parsed.data);
		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mjakazi/references");
		return { success: true };
	} catch (error) {
		console.error("[actions/referrals] inviteReferrer failed:", error);
		return { success: false, error: "Could not send the invitation." };
	}
};

// the referrer submits from the public page. no session — the single-use token
// is the capability, and the service is the only guard
const submitReferralAction = async (input: unknown): Promise<ActionResult> => {
	try {
		const parsed = submitSchema.safeParse(input);
		if (!parsed.success) {
			return {
				success: false,
				error: parsed.error.issues[0]?.message ?? "Check the details and try again.",
			};
		}

		const payload = await getPayload({ config });
		const result = await submitReferral(payload, parsed.data);
		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		return { success: true };
	} catch (error) {
		console.error("[actions/referrals] submitReferral failed:", error);
		return { success: false, error: "Could not submit your referral." };
	}
};

// the mjakazi withdraws an unanswered invitation
const withdrawInviteAction = async (referralId: string): Promise<ActionResult> => {
	try {
		const parsed = z.string().trim().min(1).safeParse(referralId);
		if (!parsed.success) return { success: false, error: "Invitation not found." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (user.role !== "mjakazi") return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await withdrawInvite(payload, user, parsed.data);
		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/mjakazi/references");
		return { success: true };
	} catch (error) {
		console.error("[actions/referrals] withdrawInvite failed:", error);
		return { success: false, error: "Could not withdraw the invitation." };
	}
};

// pending → published. staff/admin only — the service re-checks the role and
// writes the audit entry
const publishReferralAction = async (referralId: string): Promise<ActionResult> => {
	try {
		const parsed = z.string().trim().min(1).safeParse(referralId);
		if (!parsed.success) return { success: false, error: "Referral not found." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (!isBackOffice(user)) return { success: false, error: "Forbidden." };

		const payload = await getPayload({ config });
		const result = await publishReferral(payload, user, parsed.data);
		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/staff/referrals");
		revalidatePath("/dashboard/mjakazi/references");
		return { success: true };
	} catch (error) {
		console.error("[actions/referrals] publishReferral failed:", error);
		return { success: false, error: "Could not publish the referral." };
	}
};

// pending → rejected, or published → rejected (a takedown). staff/admin only; a
// reason is mandatory
const rejectReferralAction = async (
	referralId: string,
	reason: string,
): Promise<ActionResult> => {
	try {
		const parsedId = z.string().trim().min(1).safeParse(referralId);
		if (!parsedId.success) return { success: false, error: "Referral not found." };

		const user = await getCurrentUser();
		if (!user) return { success: false, error: "You must be signed in." };
		if (!isBackOffice(user)) return { success: false, error: "Forbidden." };

		const parsedReason = rejectionReasonSchema.safeParse(reason);
		if (!parsedReason.success) {
			return { success: false, error: "A rejection reason is required." };
		}

		const payload = await getPayload({ config });
		const result = await rejectReferral(payload, user, parsedId.data, parsedReason.data);
		if (!result.success) {
			return { success: false, error: result.error, code: result.code };
		}

		revalidatePath("/dashboard/staff/referrals");
		revalidatePath("/dashboard/mjakazi/references");
		return { success: true };
	} catch (error) {
		console.error("[actions/referrals] rejectReferral failed:", error);
		return { success: false, error: "Could not reject the referral." };
	}
};

export {
	inviteReferrerAction,
	publishReferralAction,
	rejectReferralAction,
	submitReferralAction,
	withdrawInviteAction,
};
