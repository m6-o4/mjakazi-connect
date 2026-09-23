import type { Payload } from "payload";

import type { PlatformSetting, User } from "@/payload-types";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

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

// the normalized eoi policy the rest of the app reads. every value is required
// because getEoiPolicy fills unset fields from the defaults below — the raw
// global type is entirely optional fields
type EoiPolicy = {
	minBatch: number;
	maxBatch: number;
	responseThresholdPercent: number;
	expiryDays: number;
	resendCooldownDays: number;
};

type RawEoiPolicy = NonNullable<PlatformSetting["eoiPolicy"]>;

// the fallbacks used when the global, the group, or an individual field is unset.
// they mirror the schema defaults, so behaviour is identical whether or not an
// admin has ever opened the settings form
const DEFAULT_EOI_POLICY: EoiPolicy = {
	minBatch: 1,
	maxBatch: 5,
	responseThresholdPercent: 50,
	expiryDays: 7,
	resendCooldownDays: 14,
};

// reads one policy number, falling back to its default when the stored value is
// missing, non-integer or out of range. the fallback is deliberate: a single bad
// field must not poison the whole policy
const policyNumber = (
	value: unknown,
	fallback: number,
	min: number,
	max?: number,
): number => {
	if (typeof value !== "number" || !Number.isInteger(value) || value < min) {
		return fallback;
	}
	if (typeof max === "number" && value > max) return fallback;
	return value;
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
	if (!Number.isInteger(amount) || amount < 1) {
		return fail("The fee must be a whole number of KSh, at least KSh 1.", "invalid_fee");
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
		if (!Number.isInteger(tier.price) || tier.price < 1) {
			return fail(
				"Each tier price must be a whole number of KSh, at least KSh 1.",
				"invalid_price",
			);
		}
		if (!Number.isInteger(tier.durationDays) || tier.durationDays < 1) {
			return fail(
				"Each tier duration must be a whole number of days, at least 1 day.",
				"invalid_duration",
			);
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

// reads the expression-of-interest policy from platform-settings, filling any
// unset or malformed field with its default so callers always get a usable,
// internally consistent policy. a stored minBatch above maxBatch is discarded in
// favour of the defaults rather than trusted
const getEoiPolicy = async (payload: Payload): Promise<EoiPolicy> => {
	let raw: RawEoiPolicy | undefined;
	try {
		const settings = await payload.findGlobal({ slug: "platform-settings" });
		raw = settings.eoiPolicy ?? undefined;
	} catch (error) {
		console.error("[services/settings] getEoiPolicy failed:", error);
		return DEFAULT_EOI_POLICY;
	}

	const policy: EoiPolicy = {
		minBatch: policyNumber(raw?.minBatch, DEFAULT_EOI_POLICY.minBatch, 1),
		maxBatch: policyNumber(raw?.maxBatch, DEFAULT_EOI_POLICY.maxBatch, 1),
		responseThresholdPercent: policyNumber(
			raw?.responseThresholdPercent,
			DEFAULT_EOI_POLICY.responseThresholdPercent,
			1,
			100,
		),
		expiryDays: policyNumber(raw?.expiryDays, DEFAULT_EOI_POLICY.expiryDays, 1),
		resendCooldownDays: policyNumber(
			raw?.resendCooldownDays,
			DEFAULT_EOI_POLICY.resendCooldownDays,
			0,
		),
	};

	if (policy.minBatch > policy.maxBatch) {
		console.warn(
			"[services/settings] eoi policy minBatch exceeds maxBatch; using defaults",
		);
		return DEFAULT_EOI_POLICY;
	}

	return policy;
};

// admin-only write of the whole policy. validated here so a malformed value can
// never reach the global; minBatch > maxBatch is refused rather than stored
const updateEoiPolicy = async (
	payload: Payload,
	actor: User,
	policy: EoiPolicy,
): Promise<Result> => {
	if (actor.role !== "admin") return fail("Forbidden.", "forbidden");

	const isWhole = (value: number, min: number, max?: number): boolean =>
		Number.isInteger(value) && value >= min && (max === undefined || value <= max);

	if (!isWhole(policy.minBatch, 1) || !isWhole(policy.maxBatch, 1)) {
		return fail("Batch sizes must be whole numbers, at least 1.", "invalid_batch");
	}
	if (policy.minBatch > policy.maxBatch) {
		return fail("The minimum batch cannot be larger than the maximum.", "invalid_batch");
	}
	if (!isWhole(policy.responseThresholdPercent, 1, 100)) {
		return fail("The response threshold must be between 1 and 100.", "invalid_threshold");
	}
	if (!isWhole(policy.expiryDays, 1)) {
		return fail("The interest expiry must be at least 1 day.", "invalid_expiry");
	}
	if (!isWhole(policy.resendCooldownDays, 0)) {
		return fail("The re-send cooldown must be 0 days or more.", "invalid_cooldown");
	}

	try {
		await payload.updateGlobal({
			slug: "platform-settings",
			data: { eoiPolicy: policy },
			overrideAccess: true,
		});
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/settings] updateEoiPolicy failed:", error);
		return fail("Could not save the interest policy.");
	}
};

export {
	getEoiPolicy,
	getSubscriptionTiers,
	getTierById,
	getVerificationFee,
	updateEoiPolicy,
	updateSubscriptionTiers,
	updateVerificationFee,
};
export type { EoiPolicy, SubscriptionTier };
