"use client";

import { CheckCircle2, Crown, Loader2, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

import { initiateSubscriptionPaymentAction } from "@/app/actions/subscription";
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

type TierOption = {
	tierId: string;
	name: string;
	price: number;
	durationDays: number;
	description: string | null;
	isConcierge: boolean;
};

type SubscriptionState =
	"none" | "pending_payment" | "active" | "expired" | "suspended" | "blacklisted";

type PurchaseSubscriptionProps = {
	tiers: TierOption[];
	state: SubscriptionState;
	expiry: string | null;
	phone: string | null;
};

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 150000;

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

// the mwajiri purchase flow. renders the live tier list, collects the m-pesa
// phone, sends the stk push, then polls router.refresh() until the callback
// flips the subscription into `active` and the server re-renders this component
const PurchaseSubscription = ({
	tiers,
	state,
	expiry,
	phone,
}: PurchaseSubscriptionProps) => {
	const router = useRouter();
	const [selectedTierId, setSelectedTierId] = useState<string | null>(
		tiers[0]?.tierId ?? null,
	);
	const [phoneValue, setPhoneValue] = useState<string>(phone ?? "");
	const [status, setStatus] = useState<"idle" | "paying" | "awaiting" | "timedOut">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);

	const isActive = state === "active";
	const restricted = state === "suspended" || state === "blacklisted";
	const selectedTier = tiers.find((tier) => tier.tierId === selectedTierId) ?? null;
	// a purchase is "in flight" only while the subscription has not yet flipped to
	// active. deriving this (rather than resetting state in an effect) means the
	// callback landing on `active` naturally ends the polling without an extra render
	const awaiting = status === "awaiting" && state !== "active";

	useEffect(() => {
		if (!awaiting) return;

		const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
		const timeout = setTimeout(() => {
			clearInterval(interval);
			setStatus("timedOut");
		}, POLL_TIMEOUT_MS);

		return () => {
			clearInterval(interval);
			clearTimeout(timeout);
		};
	}, [awaiting, router]);

	const pay = async () => {
		if (!selectedTierId) return;
		setStatus("paying");
		setError(null);
		try {
			const result = await initiateSubscriptionPaymentAction({
				tierId: selectedTierId,
				phone: phoneValue,
			});
			if (!result.success) {
				setError(result.error ?? "Could not start the payment.");
				setStatus("idle");
				return;
			}
			posthog.capture("payment_initiated", {
				paymentType: "subscription",
				tierId: selectedTierId,
			});
			setStatus("awaiting");
		} catch {
			setError("Could not start the payment.");
			setStatus("idle");
		}
	};

	const selectTier = (tierId: string) => {
		setSelectedTierId(tierId);
		posthog.capture("plan_selected", { tierId });
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
					const selected = tier.tierId === selectedTierId;
					return (
						<button
							key={tier.tierId}
							type="button"
							onClick={() => selectTier(tier.tierId)}
							aria-pressed={selected}
							className={`bg-card flex cursor-pointer flex-col gap-2 rounded-lg p-4 text-left transition-all ${
								selected
									? "ring-primary ring-2"
									: "ring-border hover:ring-primary/40 ring-1"
							}`}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-heading font-semibold">{tier.name}</span>
								{tier.isConcierge ? (
									<Badge variant="outline" className="text-accent gap-1">
										<Crown className="size-3" />
										Concierge
									</Badge>
								) : null}
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
						{isActive ? "Extend your plan" : "Pay by M-Pesa"}
					</CardTitle>
					<CardDescription>
						Enter the phone number that should receive the M-Pesa payment prompt.
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

					{status === "timedOut" ? (
						<p className="text-muted-foreground text-sm">
							We have not received a confirmation yet. Your request may have expired — try
							again.
						</p>
					) : null}

					{error ? <p className="text-destructive text-xs">{error}</p> : null}

					{!awaiting ? (
						<Button
							type="button"
							onClick={pay}
							disabled={!selectedTier || !phoneValue.trim() || status === "paying"}
						>
							{status === "paying"
								? "Sending request..."
								: isActive
									? `Extend — KSh ${selectedTier?.price ?? ""}`
									: `Pay KSh ${selectedTier?.price ?? ""}`}
						</Button>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
};

export { PurchaseSubscription };
