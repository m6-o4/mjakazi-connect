"use client";

import { CheckCircle2, Crown, Loader2, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useRef, useState } from "react";

import { initiateSubscriptionPaymentAction } from "@/app/actions/subscription";
import { PaymentSuccessNotice } from "@/components/dashboard/payments/payment-success-notice";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifySuccess } from "@/lib/notify";

type TierOption = {
	tierId: string;
	name: string;
	rank: number;
	price: number;
	durationDays: number;
	description: string | null;
	isConcierge: boolean;
};

type SubscriptionState =
	"none" | "pending_payment" | "active" | "expired" | "suspended" | "blacklisted";

// how a plan selection relates to the active subscription, by rank. `switch` is
// the fallback when the current tier is no longer in the active list, matching the
// server's classification. the server classifies the same way on confirmation, so
// the copy here matches what happens
type PlanChange = "upgrade" | "downgrade" | "renewal" | "switch";

type PurchaseSubscriptionProps = {
	tiers: TierOption[];
	state: SubscriptionState;
	expiry: string | null;
	// the subscription's current tier, so the ui can label the current plan and
	// tell an upgrade from a downgrade from a renewal
	currentTierId: string | null;
	phone: string | null;
	// the caller's most recent subscription payment, read server-side. used to
	// detect — after a poll refresh — that a freshly initiated payment settled,
	// so the ui can show an explicit "payment received" cue. the payment id is
	// the anchor, so a renewal/upgrade (where state stays `active`) still detects
	// the new payment rather than the previous one
	latestPaymentId?: string | null;
	latestPaymentStatus?: string | null;
};

const POLL_INTERVAL_MS = 5000;
// once the window has passed the card says it is still checking, so the cadence
// drops rather than the check stopping — a forgotten tab must not poll every five
// seconds forever
const SLOW_POLL_INTERVAL_MS = 30000;
// how long the card claims to be waiting on the handset before the copy admits
// the window has passed. polling does not stop here
const SPINNER_WINDOW_MS = 150000;

// datetimes are stored utc and rendered in nairobi per code-standards
const formatExpiry = (iso: string | null): string | null => {
	if (!iso) return null;
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "Africa/Nairobi",
	});
};

// the success copy follows what was actually bought this session. a payment
// detected after a refresh carries no in-session selection, so it falls back to
// whether the subscription was already active at mount
const describePurchase = (
	change: PlanChange | null,
	wasActiveAtMount: boolean,
): string => {
	switch (change) {
		case "upgrade":
			return "Your payment is confirmed and your plan has been upgraded.";
		case "downgrade":
			return "Your payment is confirmed and your plan has been changed.";
		case "renewal":
			return "Your payment is confirmed and your plan has been extended.";
		case "switch":
			return "Your payment is confirmed and your plan has been changed.";
		default:
			return wasActiveAtMount
				? "Your payment is confirmed and your plan has been extended."
				: "Your payment is confirmed and your subscription is now active.";
	}
};

// the mwajiri purchase flow. renders the live tier list, collects the m-pesa
// phone, sends the stk push, then polls router.refresh() until the callback
// confirms the newest payment and the server re-renders this component. the
// payment id (not the subscription state) is the anchor, so a mid-cycle renewal
// or upgrade — where the state is already `active` — still detects the new
// payment and shows the success cue
const PurchaseSubscription = ({
	tiers,
	state,
	expiry,
	currentTierId,
	phone,
	latestPaymentId = null,
	latestPaymentStatus = null,
}: PurchaseSubscriptionProps) => {
	const router = useRouter();
	const [selectedTierId, setSelectedTierId] = useState<string | null>(
		// an active subscriber starts on their current plan, so the default action
		// is "extend"; a new subscriber starts on the first (lowest-ranked) plan
		(currentTierId && tiers.some((tier) => tier.tierId === currentTierId)
			? currentTierId
			: tiers[0]?.tierId) ?? null,
	);
	const [phoneValue, setPhoneValue] = useState<string>(phone ?? "");
	const [status, setStatus] = useState<"idle" | "paying" | "awaiting" | "unconfirmed">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);
	const [paymentReceived, setPaymentReceived] = useState(false);
	// captured once, at mount: an upgrade/renewal starts from `active`, a fresh
	// purchase from `none`/`pending_payment`. only affects the success copy
	const [wasActiveAtMount] = useState(state === "active");
	const initialPaymentId = useRef<string | null>(latestPaymentId);
	// captured at the moment pay() is called, so the success copy describes the
	// plan that was actually bought even if the selection changes while awaiting
	const [purchasedPlanChange, setPurchasedPlanChange] = useState<PlanChange | null>(null);

	const isActive = state === "active";
	const restricted = state === "suspended" || state === "blacklisted";
	const selectedTier = tiers.find((tier) => tier.tierId === selectedTierId) ?? null;
	const currentTier = tiers.find((tier) => tier.tierId === currentTierId) ?? null;

	// a lower-ranked tier is blocked while the plan is active — the server refuses the
	// downgrade too. the current tier is never below itself, so blocking is only ever
	// true for a tier strictly below the current one
	const isBlocked = (tier: TierOption): boolean =>
		isActive && currentTier !== null && tier.rank < currentTier.rank;

	// the effective selection, guarded so a stale pick can never arm a blocked plan.
	// a refresh can move the current tier under a selection made before it, so a
	// blocked selection falls back to the current tier, then the lowest-ranked tier
	// that is still allowed — the pay button must never point at a downgrade
	const effectiveSelectedTier =
		selectedTier && !isBlocked(selectedTier)
			? selectedTier
			: (currentTier ?? tiers.find((tier) => !isBlocked(tier)) ?? null);
	const effectiveSelectedTierId = effectiveSelectedTier?.tierId ?? null;

	// the direction of the selected plan against the current one — null while no
	// subscription is active, since there is nothing to upgrade, downgrade or renew
	const planChangeFor = (tier: TierOption): PlanChange | null => {
		if (!isActive) return null;
		if (!currentTier) return "switch";
		if (tier.tierId === currentTier.tierId) return "renewal";
		return tier.rank > currentTier.rank ? "upgrade" : "downgrade";
	};
	const selectedPlanChange = effectiveSelectedTier
		? planChangeFor(effectiveSelectedTier)
		: null;
	// the label follows the selected plan, so choosing a different tier reads as
	// an upgrade or a change rather than a plain extend
	const paymentHeading = !isActive
		? "Pay by M-Pesa"
		: selectedPlanChange === "upgrade"
			? "Upgrade your plan"
			: selectedPlanChange === "downgrade" || selectedPlanChange === "switch"
				? "Change your plan"
				: "Extend your plan";
	const paymentCta = !isActive
		? `Pay KSh ${effectiveSelectedTier?.price ?? ""}`
		: selectedPlanChange === "upgrade"
			? `Upgrade — KSh ${effectiveSelectedTier?.price ?? ""}`
			: selectedPlanChange === "downgrade" || selectedPlanChange === "switch"
				? `Switch plan — KSh ${effectiveSelectedTier?.price ?? ""}`
				: `Extend — KSh ${effectiveSelectedTier?.price ?? ""}`;
	// in flight for as long as an stk push is awaiting its callback. the poll
	// stops when the success effect above flips `status` back to idle — not on a
	// state change, since an upgrade never changes the state
	const awaiting = status === "awaiting";
	const unconfirmed = status === "unconfirmed";

	useEffect(() => {
		if (paymentReceived) return;
		if (
			latestPaymentId &&
			latestPaymentId !== initialPaymentId.current &&
			latestPaymentStatus === "confirmed"
		) {
			setPaymentReceived(true);
			setStatus("idle");
			// the inline notice is the persistent record; this toast is the
			// immediate cue. the payment id anchor above means it fires once, on
			// the transition into a confirmed newest payment
			notifySuccess("Payment received", {
				id: "subscription-payment-received",
				description: describePurchase(purchasedPlanChange, wasActiveAtMount),
			});
		}
	}, [
		latestPaymentId,
		latestPaymentStatus,
		paymentReceived,
		wasActiveAtMount,
		purchasedPlanChange,
	]);

	// poll for as long as a push is outstanding, the passed window included — the
	// server still accepts a late callback, so the clock alone is not a reason to
	// stop looking
	useEffect(() => {
		if (status !== "awaiting" && status !== "unconfirmed") return;

		const interval = setInterval(
			() => router.refresh(),
			status === "unconfirmed" ? SLOW_POLL_INTERVAL_MS : POLL_INTERVAL_MS,
		);
		return () => clearInterval(interval);
	}, [status, router]);

	useEffect(() => {
		if (status !== "awaiting") return;

		const window = setTimeout(() => setStatus("unconfirmed"), SPINNER_WINDOW_MS);
		return () => clearTimeout(window);
	}, [status]);

	const pay = async () => {
		if (!effectiveSelectedTierId) return;
		setPurchasedPlanChange(
			effectiveSelectedTier ? planChangeFor(effectiveSelectedTier) : null,
		);
		setStatus("paying");
		setError(null);
		try {
			const result = await initiateSubscriptionPaymentAction({
				tierId: effectiveSelectedTierId,
				phone: phoneValue,
			});
			if (!result.success) {
				setError(result.error ?? "Could not start the payment.");
				setStatus("idle");
				return;
			}
			posthog.capture("payment_initiated", {
				paymentType: "subscription",
				tierId: effectiveSelectedTierId,
			});
			setStatus("awaiting");
		} catch {
			setError("Could not start the payment.");
			setStatus("idle");
		}
	};

	const selectTier = (tier: TierOption) => {
		// the disabled attribute already prevents the click; this guards the handler
		// so a blocked tier can never become the selection programmatically either
		if (isBlocked(tier)) return;
		setSelectedTierId(tier.tierId);
		posthog.capture("plan_selected", { tierId: tier.tierId });
	};

	if (tiers.length === 0) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>No plans available</CardTitle>
					<CardDescription>
						Subscription plans have not been configured yet. Please check back soon.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	if (restricted) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Access restricted</CardTitle>
					<CardDescription>
						Your account cannot purchase a subscription right now. Contact support for
						help.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			{paymentReceived ? (
				<PaymentSuccessNotice
					title="Payment received"
					description={describePurchase(purchasedPlanChange, wasActiveAtMount)}
				/>
			) : null}

			{isActive ? (
				<Card className="ring-primary/40">
					<CardContent className="flex flex-col gap-2 pt-(--card-spacing)">
						<div className="text-primary flex items-center gap-2">
							<CheckCircle2 className="size-5" />
							<span className="font-semibold">Your subscription is active</span>
						</div>
						<p className="text-muted-foreground text-sm">
							Contact details stay unlocked until {formatExpiry(expiry)}. Buying another
							plan extends that date.
						</p>
					</CardContent>
				</Card>
			) : null}

			<div className="grid gap-4 md:grid-cols-3">
				{tiers.map((tier) => {
					const blocked = isBlocked(tier);
					const selected = tier.tierId === effectiveSelectedTierId;
					return (
						<button
							key={tier.tierId}
							type="button"
							onClick={() => selectTier(tier)}
							disabled={blocked}
							aria-disabled={blocked}
							aria-pressed={selected}
							className={`bg-card flex flex-col gap-2 rounded-lg p-4 text-left transition-all ${
								blocked
									? "ring-border cursor-not-allowed opacity-60 ring-1"
									: selected
										? "ring-primary cursor-pointer ring-2"
										: "ring-border hover:ring-primary/40 cursor-pointer ring-1"
							}`}
						>
							<div className="flex items-center justify-between gap-2">
								<span
									className={`font-semibold ${blocked ? "text-muted-foreground" : "text-heading"}`}
								>
									{tier.name}
								</span>
								<div className="flex items-center gap-1.5">
									{tier.tierId === currentTierId ? (
										<Badge variant="secondary">Current</Badge>
									) : null}
									{blocked ? (
										<Badge variant="outline" className="text-muted-foreground">
											Below your plan
										</Badge>
									) : null}
									{tier.isConcierge ? (
										<Badge variant="outline" className="text-accent gap-1">
											<Crown className="size-3" />
											Concierge
										</Badge>
									) : null}
								</div>
							</div>
							<span className="text-2xl font-semibold">KSh {tier.price}</span>
							<span className="text-muted-foreground text-xs">
								{tier.durationDays} days access
							</span>
							{tier.description ? (
								<span className="text-muted-foreground text-sm">{tier.description}</span>
							) : null}
						</button>
					);
				})}
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Smartphone className="text-accent size-5 shrink-0" />
						{paymentHeading}
					</CardTitle>
					<CardDescription>
						Enter the phone number that should receive the M-Pesa payment prompt.
						{isActive
							? " The time left on your current plan is converted into days on the new one — nothing is refunded in cash."
							: ""}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="mpesa-phone">M-Pesa phone number</Label>
						<Input
							id="mpesa-phone"
							inputMode="tel"
							placeholder="0712 345 678"
							value={phoneValue}
							onChange={(event) => setPhoneValue(event.target.value)}
						/>
					</div>

					{awaiting ? (
						<div className="text-muted-foreground flex flex-col gap-2 text-sm">
							<div className="flex items-center gap-2">
								<Loader2 className="size-4 animate-spin" />
								Waiting for your M-Pesa confirmation…
							</div>
							<p>
								Check your phone and enter your M-Pesa PIN. This page updates
								automatically.
							</p>
						</div>
					) : null}

					{unconfirmed ? (
						<div className="flex flex-col gap-2 text-sm">
							<p className="text-muted-foreground">
								M-Pesa has not confirmed this payment yet. This page is still checking.
							</p>
							<p>
								If the fee has already left your M-Pesa, do not pay again — the payment is
								recorded against your account and can be traced with your M-Pesa
								reference.
							</p>
						</div>
					) : null}

					{error ? <p className="text-destructive text-xs">{error}</p> : null}

					{!awaiting && !unconfirmed ? (
						<Button
							type="button"
							onClick={pay}
							disabled={
								!effectiveSelectedTier ||
								isBlocked(effectiveSelectedTier) ||
								!phoneValue.trim() ||
								status === "paying"
							}
						>
							{status === "paying" ? "Sending request..." : paymentCta}
						</Button>
					) : null}

					{unconfirmed ? (
						<Button type="button" variant="outline" onClick={() => router.refresh()}>
							Check again
						</Button>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
};

export { PurchaseSubscription };
