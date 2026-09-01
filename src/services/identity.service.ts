import { ValidationError, type Payload } from "payload";

import type { User } from "@/payload-types";
import { ensureSubscription } from "@/services/subscription.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

// the unique `user` relation makes a concurrent duplicate create fail with a
// validation error rather than a second record, so the race is harmless
const isDuplicateUserError = (error: unknown): boolean =>
	error instanceof ValidationError &&
	Boolean(error.data?.errors?.some((fieldError) => fieldError.path === "user"));

// idempotent — ensures the 1:1 domain profile for a user exists, creating it
// only when one is not already present. safe to call on every sign-in
const ensureProfile = async (payload: Payload, user: User): Promise<Result<void>> => {
	// displayName is public (directory + marketing), so the default is the first
	// name only — never the full name or email, which the owner should reveal
	// deliberately rather than by default
	const displayName = user.firstName?.trim() || "Mjakazi";

	try {
		if (user.role === "mjakazi") {
			const existing = await payload.find({
				collection: "wajakazi-profiles",
				where: { user: { equals: user.id } },
				limit: 1,
			});

			if (existing.docs.length === 0) {
				try {
					await payload.create({
						collection: "wajakazi-profiles",
						data: {
							user: user.id,
							displayName,
							verificationState: "draft",
							availabilityStatus: "available",
						},
					});
				} catch (error) {
					// a concurrent registration may have created the profile between
					// the find and this create — that is a win, not a failure
					if (!isDuplicateUserError(error)) throw error;
				}
			}
		}

		if (user.role === "mwajiri") {
			const existing = await payload.find({
				collection: "waajiri-profiles",
				where: { user: { equals: user.id } },
				limit: 1,
			});

			if (existing.docs.length === 0) {
				try {
					await payload.create({
						collection: "waajiri-profiles",
						data: { user: user.id, blacklistState: "active" },
					});
				} catch (error) {
					if (!isDuplicateUserError(error)) throw error;
				}
			}

			// the 1:1 subscription record is created alongside the profile so the
			// `none` state is real from day one. a failure here is non-fatal — the
			// subscription service re-creates it defensively on first purchase
			const subscription = await ensureSubscription(payload, user);
			if (!subscription.success) {
				console.error(
					"[services/identity] ensureSubscription failed:",
					subscription.error,
				);
			}
		}

		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/identity] ensureProfile failed:", error);
		return { success: false, error: "Could not create the domain profile." };
	}
};

export { ensureProfile };
