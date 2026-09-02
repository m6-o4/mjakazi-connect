import { addDays } from "date-fns";
import type { Payload } from "payload";

import { writeAuditLog, type AuditAction } from "@/lib/audit";
import type { Payment, Subscription, User } from "@/payload-types";
import { getTierById, type SubscriptionTier } from "@/services/settings.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type SubscriptionState = NonNullable<Subscription["subscriptionState"]>;

// the whitelist of legal transitions. each entry lists the states reachable from
// its key; anything not listed — including a no-op from === to — is refused.
// `none → active` and `expired → active` are defensive edges: a confirmed payment
// always grants access, even if the caller skipped the normal beginPurchase step.
// suspended and blacklisted are terminal (reinstate lands in Phase 10.1).
const TRANSITIONS: Record<SubscriptionState, SubscriptionState[]> = {
	none: ["pending_payment", "active", "suspended", "blacklisted"],
	pending_payment: ["active", "suspended", "blacklisted"],
	active: ["expired", "suspended", "blacklisted"],
	expired: ["pending_payment", "active", "suspended", "blacklisted"],
	suspended: [],
	blacklisted: [],
};

// the bookkeeping fields the service writes; the state itself is passed separately
type SubscriptionData = Partial<
	Pick<
		Subscription,
		| "tierId"
		| "tierName"
		| "tierStartedAt"
		| "tierExpiry"
		| "suspendedAt"
		| "suspensionReason"
		| "lastPaymentId"
	>
>;

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

const isLegalTransition = (from: SubscriptionState, to: SubscriptionState): boolean =>
	TRANSITIONS[from].includes(to);

// relationships come back as an id string at depth 0, or as an object when
// populated. normalized to an id here
const toId = (
	value: string | { id?: string | number } | null | undefined,
): string | null => {
	if (!value) return null;
	if (typeof value === "string") return value;
	return typeof value.id === "number" ? String(value.id) : (value.id ?? null);
};

// the actor label is a name snapshot so the log stays readable after an account
// is renamed or deleted
const userLabel = (user: User): string => {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return name || user.email;
};

// trusted system read resolving the subscription for a user id. subscriptions are
// 1:1 with users, so this returns at most one record
const getSubscriptionByUser = async (
	payload: Payload,
	userId: string,
): Promise<Subscription | null> => {
	try {
		const result = await payload.find({
			collection: "subscriptions",
			where: { user: { equals: userId } },
			limit: 1,
			overrideAccess: true,
		});
		return result.docs[0] ?? null;
	} catch {
		return null;
	}
};

// resolves the caller's own subscription, respecting access control. returns null
// when no record exists yet — the page renders that as `none`
const getOwnSubscription = async (
	payload: Payload,
	user: User,
): Promise<Subscription | null> => {
	if (user.role !== "mwajiri") return null;

	const result = await payload.find({
		collection: "subscriptions",
		where: { user: { equals: user.id } },
		limit: 1,
		overrideAccess: false,
		req: { user },
	});

	return result.docs[0] ?? null;
};

const loadSubscriptionById = async (
	payload: Payload,
	subscriptionId: string,
): Promise<Subscription | null> => {
	try {
		return await payload.findByID({
			collection: "subscriptions",
			id: subscriptionId,
			depth: 0,
		});
	} catch {
		return null;
	}
};

// resolves the subscription for a user, creating a `none` record when one is
// absent. the `none` record is normally created at registration, so this only
// creates defensively when a record is missing (e.g. created before registration
// was wired, or a failed write)
const getOrCreateSubscription = async (
	payload: Payload,
	userId: string,
): Promise<Subscription | null> => {
	const existing = await getSubscriptionByUser(payload, userId);
	if (existing) return existing;

	try {
		return await payload.create({
			collection: "subscriptions",
			data: { user: userId, subscriptionState: "none" },
			overrideAccess: true,
		});
	} catch (error) {
		// a concurrent registration may have created it between the find and this
		// create — that is a win, not a failure
		console.warn("[services/subscription] getOrCreate create failed:", error);
		return getSubscriptionByUser(payload, userId);
	}
};

const auditSubscriptionTransition = async ({
	action,
	actor,
	subscription,
	previousState,
	nextState,
	reason,
	metadata,
	source,
}: {
	action: AuditAction;
	actor: User | null;
	subscription: Subscription;
	previousState: SubscriptionState;
	nextState: SubscriptionState;
	reason?: string;
	metadata?: Record<string, unknown>;
	source: "user" | "system";
}): Promise<void> => {
	await writeAuditLog({
		action,
		actorId: actor?.id ?? null,
		actorLabel: actor ? userLabel(actor) : null,
		targetId: toId(subscription.user),
		targetLabel: null,
		previousState,
		newState: nextState,
		reason,
		metadata,
		source,
	});
};

type ApplyTransitionInput = {
	payload: Payload;
	subscription: Subscription;
	nextState: SubscriptionState;
	data?: SubscriptionData;
	action: AuditAction;
	actor: User | null;
	source?: "user" | "system";
	reason?: string;
	metadata?: Record<string, unknown>;
};

const applyTransition = async ({
	payload,
	subscription,
	nextState,
	data = {},
	action,
	actor,
	source = "user",
	reason,
	metadata,
}: ApplyTransitionInput): Promise<Result<Subscription>> => {
	const previousState = subscription.subscriptionState;

	if (!isLegalTransition(previousState, nextState)) {
		return fail(
			`Invalid transition: ${previousState} → ${nextState}.`,
			"illegal_transition",
		);
	}

	try {
		// compare-and-swap: the write only lands if the state is still exactly what
		// we observed, so a concurrent transition loses instead of silently
		// double-applying. the write is trusted because the collection is sealed
		// and authorization already happened in the caller
		const result = await payload.update({
			collection: "subscriptions",
			where: {
				and: [
					{ id: { equals: subscription.id } },
					{ subscriptionState: { equals: previousState } },
				],
			},
			data: { subscriptionState: nextState, ...data },
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			return fail(
				"Subscription state changed. Please refresh and try again.",
				"conflict",
			);
		}

		await auditSubscriptionTransition({
			action,
			actor,
			subscription,
			previousState,
			nextState,
			reason,
			metadata,
			source,
		});

		return { success: true, data: result.docs[0] };
	} catch (error) {
		console.error("[services/subscription] transition failed:", error);
		return fail("Could not update the subscription state.");
	}
};

// idempotent — ensures the 1:1 subscription record exists in state `none`,
// creating it only when absent. called from identity.service at registration
const ensureSubscription = async (
	payload: Payload,
	user: User,
): Promise<Result<Subscription>> => {
	const subscription = await getOrCreateSubscription(payload, user.id);
	if (!subscription) return fail("Could not create the subscription record.");
	return { success: true, data: subscription };
};

// none/expired → pending_payment. marks the subscription as having a purchase in
// flight. a renewal while `active` or an already-pending purchase is a no-op —
// the subscription stays put and the payment record tracks the attempt
const beginPurchase = async (
	payload: Payload,
	user: User,
): Promise<Result<Subscription>> => {
	if (user.role !== "mwajiri") return fail("Forbidden", "forbidden");

	const subscription = await getOrCreateSubscription(payload, user.id);
	if (!subscription) return fail("Subscription not found.", "not_found");

	if (
		subscription.subscriptionState === "pending_payment" ||
		subscription.subscriptionState === "active"
	) {
		return { success: true, data: subscription };
	}

	if (
		subscription.subscriptionState === "none" ||
		subscription.subscriptionState === "expired"
	) {
		return applyTransition({
			payload,
			subscription,
			nextState: "pending_payment",
			action: "subscription_purchase_started",
			actor: user,
			metadata: {
				reason:
					subscription.subscriptionState === "expired" ? "renewal" : "first purchase",
			},
		});
	}

	return fail("This account cannot start a purchase.", "illegal_transition");
};

// active → active (stacking). appends the new tier's duration to the existing
// expiry rather than to now, so a renewal bought mid-window extends the window
// instead of resetting it. a direct compare-and-swap, not applyTransition, because
// the state does not change
const stackSubscription = async (
	payload: Payload,
	subscription: Subscription,
	tier: SubscriptionTier,
	paymentId: string,
): Promise<Result<Subscription>> => {
	const previousState = subscription.subscriptionState;
	const base = subscription.tierExpiry ? new Date(subscription.tierExpiry) : new Date();
	const tierExpiry = addDays(base, tier.durationDays).toISOString();

	try {
		const result = await payload.update({
			collection: "subscriptions",
			where: {
				and: [
					{ id: { equals: subscription.id } },
					{ subscriptionState: { equals: "active" } },
				],
			},
			data: {
				tierId: tier.tierId,
				tierName: tier.name,
				tierExpiry,
				lastPaymentId: paymentId,
			},
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			return fail("Subscription changed. Please refresh and try again.", "conflict");
		}

		await auditSubscriptionTransition({
			action: "subscription_activated",
			actor: null,
			subscription,
			previousState,
			nextState: "active",
			source: "system",
			metadata: {
				tierId: tier.tierId,
				tierName: tier.name,
				durationDays: tier.durationDays,
				stacked: true,
				paymentId,
			},
		});

		return { success: true, data: result.docs[0] };
	} catch (error) {
		console.error("[services/subscription] stack failed:", error);
		return fail("Could not extend the subscription.");
	}
};

// the 5.2 wire-up: a confirmed subscription payment grants (or extends) access.
// the tier duration is read live from platform-settings so an admin change applies
// with no deploy. a fresh activation sets the expiry from now; a renewal while
// active stacks onto the existing expiry. called from the payment service after
// the callback confirms. the current state is the idempotency guard, so a repeated
// activation is refused rather than double-applied
const activateSubscriptionOnPayment = async (
	payload: Payload,
	payment: Payment,
): Promise<Result<Subscription>> => {
	const userId = toId(payment.user);
	if (!userId) return fail("Payment has no payer.", "missing_user");
	if (payment.paymentType !== "subscription") {
		return fail("Not a subscription payment.", "wrong_type");
	}
	if (!payment.tierId) return fail("Payment has no tier.", "missing_tier");

	const tier = await getTierById(payload, payment.tierId);
	if (!tier) return fail("The selected tier is no longer available.", "tier_unavailable");

	const subscription = await getOrCreateSubscription(payload, userId);
	if (!subscription) return fail("Subscription not found.", "not_found");

	const now = new Date();

	if (subscription.subscriptionState === "active") {
		return stackSubscription(payload, subscription, tier, payment.id);
	}

	if (
		subscription.subscriptionState === "pending_payment" ||
		subscription.subscriptionState === "none" ||
		subscription.subscriptionState === "expired"
	) {
		return applyTransition({
			payload,
			subscription,
			nextState: "active",
			data: {
				tierId: tier.tierId,
				tierName: tier.name,
				tierStartedAt: now.toISOString(),
				tierExpiry: addDays(now, tier.durationDays).toISOString(),
				lastPaymentId: payment.id,
			},
			action: "subscription_activated",
			actor: null,
			source: "system",
			metadata: {
				tierId: tier.tierId,
				tierName: tier.name,
				durationDays: tier.durationDays,
				stacked: false,
				paymentId: payment.id,
			},
		});
	}

	return fail(`Invalid state: ${subscription.subscriptionState}.`, "illegal_transition");
};

// active → expired. the single-record transition, re-reads and compare-and-swaps
// so it is idempotent. called by the 5.3 expiry job through the bulk helper below
const expireSubscription = async (
	payload: Payload,
	subscriptionId: string,
): Promise<Result<Subscription>> => {
	const subscription = await loadSubscriptionById(payload, subscriptionId);
	if (!subscription) return fail("Subscription not found.", "not_found");
	if (subscription.subscriptionState !== "active") {
		return fail("Subscription is not active.", "wrong_state");
	}
	if (!subscription.tierExpiry || new Date(subscription.tierExpiry) > new Date()) {
		return fail("Subscription has not yet expired.", "not_expired");
	}

	return applyTransition({
		payload,
		subscription,
		nextState: "expired",
		action: "subscription_expired",
		actor: null,
		source: "system",
	});
};

// polled hourly by the 5.3 expiry job. finds active subscriptions past their
// tierExpiry and expires each idempotently, reusing expireSubscription so the
// transition and audit entry live in exactly one place. a missed window
// self-corrects on the next run because the query polls for eligible records
const expireExpiredSubscriptions = async (
	payload: Payload,
): Promise<{ expired: number }> => {
	const now = new Date();

	let candidates: Subscription[];
	try {
		// `subscriptionState` is indexed; the expiry window is applied in JS so the
		// query stays on the index and the result set stays bounded
		const result = await payload.find({
			collection: "subscriptions",
			where: { subscriptionState: { equals: "active" } },
			limit: 200,
			overrideAccess: true,
		});
		candidates = result.docs;
	} catch (error) {
		console.error("[services/subscription] expiry lookup failed:", error);
		return { expired: 0 };
	}

	let expired = 0;

	for (const subscription of candidates) {
		if (!subscription.tierExpiry || new Date(subscription.tierExpiry) > now) continue;

		const result = await expireSubscription(payload, subscription.id);
		if (result.success) expired += 1;
	}

	return { expired };
};

// any live state → suspended. staff or admin, mandatory reason. caller lands in
// Phase 10.1 (moderation)
const suspendSubscription = async (
	payload: Payload,
	actor: User,
	subscriptionId: string,
	reason: string,
): Promise<Result<Subscription>> => {
	if (actor.role !== "admin" && actor.role !== "staff")
		return fail("Forbidden", "forbidden");
	if (!reason.trim()) return fail("A suspension reason is required.", "reason_required");

	const subscription = await loadSubscriptionById(payload, subscriptionId);
	if (!subscription) return fail("Subscription not found.", "not_found");
	if (
		subscription.subscriptionState === "suspended" ||
		subscription.subscriptionState === "blacklisted"
	) {
		return fail("Subscription is already suspended or blacklisted.", "wrong_state");
	}

	return applyTransition({
		payload,
		subscription,
		nextState: "suspended",
		data: { suspendedAt: new Date().toISOString(), suspensionReason: reason.trim() },
		action: "subscription_suspended",
		actor,
		reason: reason.trim(),
	});
};

// any live state → blacklisted. admin only, terminal, mandatory reason. caller
// lands in Phase 10.1 (moderation)
const blacklistSubscription = async (
	payload: Payload,
	actor: User,
	subscriptionId: string,
	reason: string,
): Promise<Result<Subscription>> => {
	if (actor.role !== "admin") return fail("Forbidden", "forbidden");
	if (!reason.trim()) return fail("A blacklist reason is required.", "reason_required");

	const subscription = await loadSubscriptionById(payload, subscriptionId);
	if (!subscription) return fail("Subscription not found.", "not_found");
	if (subscription.subscriptionState === "blacklisted") {
		return fail("Subscription is already blacklisted.", "wrong_state");
	}

	return applyTransition({
		payload,
		subscription,
		nextState: "blacklisted",
		action: "subscription_blacklisted",
		actor,
		reason: reason.trim(),
	});
};

export {
	activateSubscriptionOnPayment,
	beginPurchase,
	blacklistSubscription,
	ensureSubscription,
	expireExpiredSubscriptions,
	expireSubscription,
	getOwnSubscription,
	suspendSubscription,
};
