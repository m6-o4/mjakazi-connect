import { addDays, isAfter } from "date-fns";
import type { Payload } from "payload";

import { writeAuditLog, type AuditAction } from "@/lib/audit";
import {
	sendSubscriptionActivatedEmail,
	sendSubscriptionReceiptEmail,
} from "@/lib/email";
import { getCallbackMetadataValue, type StkCallback } from "@/lib/mpesa";
import { toId, userLabel } from "@/lib/payload-helpers";
import { loadUserEmail } from "@/lib/user-email";
import type { Payment, Subscription, User } from "@/payload-types";
import { createConciergeCaseOnPayment } from "@/services/concierge.service";
import { getTierById, type SubscriptionTier } from "@/services/settings.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type SubscriptionState = NonNullable<Subscription["subscriptionState"]>;

// the whitelist of legal transitions. each entry lists the states reachable from
// its key; anything not listed — including a no-op from === to — is refused.
// `none → active` and `expired → active` are defensive edges: a confirmed payment
// always grants access, even if the caller skipped the normal beginPurchase step.
// `suspended` restores to `active` (window still in force) or `expired` (window
// lapsed) on reinstate; `blacklisted` is terminal.
const TRANSITIONS: Record<SubscriptionState, SubscriptionState[]> = {
	none: ["pending_payment", "active", "suspended", "blacklisted"],
	pending_payment: ["active", "suspended", "blacklisted"],
	active: ["expired", "suspended", "blacklisted"],
	expired: ["pending_payment", "active", "suspended", "blacklisted"],
	suspended: ["active", "expired"],
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

// active → active (stacking/upgrade).
// Option 2 implementation:
// If upgrading to a higher tier or higher-priced plan mid-cycle, convert the remaining
// unexpired monetary value into extra days on the new tier based on the actual amounts on file.
const stackSubscription = async (
	payload: Payload,
	subscription: Subscription,
	tier: SubscriptionTier,
	payment: Payment,
): Promise<Result<Subscription>> => {
	const previousState = subscription.subscriptionState;
	const now = new Date();
	const currentExpiry = subscription.tierExpiry ? new Date(subscription.tierExpiry) : now;

	let extraDaysFromProration = 0;

	// check if current subscription is still active with time remaining
	if (currentExpiry > now && subscription.lastPaymentId) {
		try {
			const prevPaymentId = toId(subscription.lastPaymentId);
			if (prevPaymentId) {
				// read the previous payment from file
				const prevPayment = (await payload.findByID({
					collection: "payments",
					id: prevPaymentId,
					depth: 0,
					overrideAccess: true,
				})) as Payment | null;

				if (prevPayment && prevPayment.amount > 0 && prevPayment.tierId) {
					const prevTier = await getTierById(payload, prevPayment.tierId);
					if (prevTier && prevTier.durationDays > 0 && prevTier.price > 0) {
						// calculate remaining unused fraction of the previous cycle
						const totalCycleMs = prevTier.durationDays * 24 * 60 * 60 * 1000;
						const remainingMs = Math.max(0, currentExpiry.getTime() - now.getTime());
						const unusedFraction = Math.min(1, remainingMs / totalCycleMs);

						// unexpired monetary value based on actual amount paid on file
						const unexpiredValue = prevPayment.amount * unusedFraction;

						// daily rate of the new tier based on the new payment/tier price
						const newTierPrice = payment.amount > 0 ? payment.amount : tier.price;
						const newDailyRate = newTierPrice / tier.durationDays;

						if (newDailyRate > 0) {
							extraDaysFromProration = Math.round(unexpiredValue / newDailyRate);
						}
					}
				}
			}
		} catch (err) {
			console.error("[services/subscription] proration calculation failed:", err);
		}
	}

	// base expiration: starts from now on tier switch / upgrade so new tier is effective immediately
	const totalNewDays = tier.durationDays + extraDaysFromProration;
	const tierExpiry = addDays(now, totalNewDays).toISOString();

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
				lastPaymentId: payment.id,
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
				extraDaysFromProration,
				totalNewDays,
				stacked: true,
				paymentId: payment.id,
			},
		});

		return { success: true, data: result.docs[0] };
	} catch (error) {
		console.error("[services/subscription] stack failed:", error);
		return fail("Could not extend the subscription.");
	}
};

// fire-and-forget purchase notifications — a receipt email and an activation
// email. the transition is already committed by the time this runs, so a failed
// send never blocks the state change
const notifySubscriptionPurchase = async (
	payload: Payload,
	subscription: Subscription,
	payment: Payment,
	tierName: string,
): Promise<void> => {
	try {
		const userId = toId(subscription.user);
		if (!userId) return;

		const recipient = await loadUserEmail(payload, userId);
		if (!recipient) return;

		const callback = payment.callbackPayload as unknown as StkCallback | null | undefined;
		const receiptValue = callback
			? getCallbackMetadataValue(callback, "MpesaReceiptNumber")
			: undefined;
		const receiptNumber = receiptValue == null ? "N/A" : String(receiptValue);

		await sendSubscriptionReceiptEmail({
			payload,
			to: recipient.email,
			firstName: recipient.firstName,
			tierName,
			mpesaReceiptNumber: receiptNumber,
			amount: payment.amount,
		});

		await sendSubscriptionActivatedEmail({
			payload,
			to: recipient.email,
			firstName: recipient.firstName,
			tierName,
			endDate: subscription.tierExpiry ?? new Date().toISOString(),
		});
	} catch (error) {
		console.error("[services/subscription] purchase notification email failed:", error);
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

	let result: Result<Subscription>;

	if (subscription.subscriptionState === "active") {
		result = await stackSubscription(payload, subscription, tier, payment);
	} else if (
		subscription.subscriptionState === "pending_payment" ||
		subscription.subscriptionState === "none" ||
		subscription.subscriptionState === "expired"
	) {
		result = await applyTransition({
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
	} else {
		return fail(
			`Invalid state: ${subscription.subscriptionState}.`,
			"illegal_transition",
		);
	}

	if (result.success) {
		await notifySubscriptionPurchase(payload, result.data, payment, tier.name);
		if (tier.isConcierge) {
			await createConciergeCaseOnPayment(payload, userId, result.data.id);
		}
	}

	return result;
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
	if (
		!subscription.tierExpiry ||
		isAfter(new Date(subscription.tierExpiry), new Date())
	) {
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

// suspended → active | expired. reverses a moderation suspension. admin only,
// with a mandatory reason captured by the caller's account-level audit. the
// restored state follows the window: an unexpired tier resumes as active, a
// lapsed (or never-purchased) one settles at expired
const reinstateSubscription = async (
	payload: Payload,
	actor: User,
	subscriptionId: string,
): Promise<Result<Subscription>> => {
	if (actor.role !== "admin") return fail("Forbidden", "forbidden");

	const subscription = await loadSubscriptionById(payload, subscriptionId);
	if (!subscription) return fail("Subscription not found.", "not_found");
	if (subscription.subscriptionState !== "suspended") {
		return fail("Subscription is not suspended.", "wrong_state");
	}

	const resuming =
		!subscription.tierExpiry || !isAfter(new Date(subscription.tierExpiry), new Date())
			? "expired"
			: "active";

	return applyTransition({
		payload,
		subscription,
		nextState: resuming,
		data: { suspendedAt: null, suspensionReason: null },
		action: "subscription_reinstated",
		actor,
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
	getSubscriptionByUser,
	reinstateSubscription,
	suspendSubscription,
};
