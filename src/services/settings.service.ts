import type { Payload } from "payload";

import type { PlatformSetting, User } from "@/payload-types";

type Result<T = void> =
	| { success: true; data: T }
	| { success: false; error: string; code?: string };

// the shape of a single tier as read from platform-settings, derived from the
// generated global type rather than redeclared
type SubscriptionTier = NonNullable<PlatformSetting["subscriptionTiers"]>[number];

type TierInput = {
	tierId: string;
	name: string;
	price: number;
	durationDays: number;
	description?: string | null;
	isActive: boolean;
	isConcierge: boolean;
};

const fail = (error: string, code?: string): Result<never> => ({
	success: false,
	error,
	code,
});

// reads the verification fee from the platform-settings global. this is a
// trusted server read — the fee is a public price, and the settings global's
// panel read is admin-only, so the local api's default trusted path is correct
// here. returns null when the fee is unset so callers fail closed rather than
// guessing a price.
const getVerificationFee = async (payload: Payload): Promise<number | null> => {
	try {
		const settings = await payload.findGlobal({ slug: "platform-settings" });
		return typeof settings.verificationFee === "number" ? settings.verificationFee : null;
	} catch (error) {
		console.error("[services/settings] getVerificationFee failed:", error);
		return null;
	}
};

// admin-only write of the verification fee. the amount is validated here so a
// malformed or non-numeric fee can never reach the global
const updateVerificationFee = async (
	payload: Payload,
	actor: User,
	amount: number,
): Promise<Result> => {
	if (actor.role !== "admin") return fail("Forbidden.", "forbidden");
	if (!Number.isFinite(amount) || amount < 1) {
		return fail("The fee must be at least KSh 1.", "invalid_fee");
	}

	try {
		await payload.updateGlobal({
			slug: "platform-settings",
			data: { verificationFee: amount },
			overrideAccess: true,
		});
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/settings] updateVerificationFee failed:", error);
		return fail("Could not save the fee.");
	}
};

// admin-only replace of the whole tiers array (the v1 pattern). validates each
// tier and the uniqueness of tierId before persisting. a tier removed here is
// gone from the array, so a tier already snapshotted onto subscriptions must be
// deactivated with isActive rather than removed.
const updateSubscriptionTiers = async (
	payload: Payload,
	actor: User,
	tiers: TierInput[],
): Promise<Result> => {
	if (actor.role !== "admin") return fail("Forbidden.", "forbidden");

	if (!Array.isArray(tiers) || tiers.length === 0) {
		return fail("Add at least one tier.", "no_tiers");
	}

	const ids = tiers.map((tier) => tier.tierId?.trim() ?? "");
	if (ids.some((id) => !id)) {
		return fail("Each tier needs a tier ID.", "missing_tier_id");
	}
	if (new Set(ids).size !== ids.length) {
		return fail("Each tier must have a unique tier ID.", "duplicate_tier_id");
	}

	for (const tier of tiers) {
		if (!tier.name?.trim()) {
			return fail("Each tier needs a display name.", "missing_name");
		}
		if (!Number.isFinite(tier.price) || tier.price < 1) {
			return fail("Each tier price must be at least KSh 1.", "invalid_price");
		}
		if (!Number.isFinite(tier.durationDays) || tier.durationDays < 1) {
			return fail("Each tier duration must be at least 1 day.", "invalid_duration");
		}
	}

	try {
		await payload.updateGlobal({
			slug: "platform-settings",
			data: { subscriptionTiers: tiers },
			overrideAccess: true,
		});
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/settings] updateSubscriptionTiers failed:", error);
		return fail("Could not save the tiers.");
	}
};

// reads the active subscription tiers from platform-settings. inactive tiers are
// filtered out so a mwajiri never sees (or buys) a sunset tier
const getSubscriptionTiers = async (payload: Payload): Promise<SubscriptionTier[]> => {
	try {
		const settings = await payload.findGlobal({ slug: "platform-settings" });
		return (settings.subscriptionTiers ?? []).filter((tier) => tier.isActive !== false);
	} catch (error) {
		console.error("[services/settings] getSubscriptionTiers failed:", error);
		return [];
	}
};

// resolves a single active tier by its stable id. returns null when the tier is
// absent or inactive so callers fail closed rather than charging a stale price
const getTierById = async (
	payload: Payload,
	tierId: string,
): Promise<SubscriptionTier | null> => {
	const tiers = await getSubscriptionTiers(payload);
	return tiers.find((tier) => tier.tierId === tierId) ?? null;
};

export {
	getSubscriptionTiers,
	getTierById,
	getVerificationFee,
	updateSubscriptionTiers,
	updateVerificationFee,
};
export type { SubscriptionTier };
