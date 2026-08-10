"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface Tier {
	tierId: string;
	name: string;
	price: number;
	durationDays: number;
}

interface SubscriptionPaymentCardProps {
	tier: Tier;
	// allows the mwajiri to go back and pick a different tier
	onBack: () => void;
}

type PaymentState =
	| "idle"
	| "submitting"
	| "waiting"
	| "confirmed"
	| "failed"
	| "timeout";

const formatDuration = (days: number) => {
	if (days === 14) return "2 Weeks";
	if (days === 28) return "4 Weeks";
	if (days === 46) return "6 Weeks";
	return `${days} days`;
};

const SubscriptionPaymentCard = ({ tier, onBack }: SubscriptionPaymentCardProps) => {
	const router = useRouter();
	const [phoneNumber, setPhoneNumber] = useState("");
	const [state, setState] = useState<PaymentState>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [checkoutRequestId, setCheckoutRequestId] = useState<string | null>(null);

	// polling interval ref — cleared on unmount or when a terminal state is reached
	const pollRef = useRef<NodeJS.Timeout | null>(null);

	// timeout ref — expires the waiting state after 2 minutes if no callback lands
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	const clearTimers = () => {
		if (pollRef.current) clearInterval(pollRef.current);
		if (timeoutRef.current) clearTimeout(timeoutRef.current);
	};

	useEffect(() => {
		return () => clearTimers();
	}, []);

	const handleSubmit = async () => {
		setErrorMessage(null);
		setState("submitting");

		try {
			const res = await fetch("/apis/subscriptions/initiate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tierId: tier.tierId, phoneNumber }),
			});

			const data = await res.json();

			if (!res.ok) {
				setErrorMessage(data.error ?? "Payment initiation failed. Please try again.");
				setState("failed");
				return;
			}

			setCheckoutRequestId(data.checkoutRequestId);
			setState("waiting");
			startPolling();
		} catch {
			setErrorMessage("A network error occurred. Please try again.");
			setState("failed");
		}
	};

	const startPolling = () => {
		// poll /apis/me every 5 seconds to detect when the callback has resolved
		pollRef.current = setInterval(async () => {
			try {
				const res = await fetch("/apis/me", { cache: "no-store" });
				const data = await res.json();

				if (data?.subscriptionStatus === "active") {
					clearTimers();
					setState("confirmed");
					// refresh the server component so the active subscription display renders
					setTimeout(() => router.refresh(), 1000);
				}
			} catch {
				// polling errors are silent — the timeout handles the failure case
			}
		}, 5000);

		// 2 minutes matches the inngest timeout window
		timeoutRef.current = setTimeout(
			() => {
				clearTimers();
				setState("timeout");
			},
			2 * 60 * 1000,
		);
	};

	// confirmed state — subscription is active
	if (state === "confirmed") {
		return (
			<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
				<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
					<CheckCircle2 className="text-accent size-5 shrink-0" />
					<div>
						<p className="text-accent text-sm font-semibold">Subscription Activated</p>
						<p className="text-muted-foreground text-xs">
							Your {tier.name} plan is now active.
						</p>
					</div>
				</div>
			</div>
		);
	}

	// waiting state — stk push sent, polling for callback
	if (state === "waiting") {
		return (
			<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
				<div>
					<p className="text-foreground font-semibold">{tier.name} Plan</p>
					<p className="text-muted-foreground text-sm">
						KSh {tier.price.toLocaleString()} ·{" "}
						{formatDuration(tier.durationDays).toLowerCase()}
					</p>
				</div>
				<div className="bg-muted/40 flex items-center gap-3 rounded-lg px-4 py-4">
					<Loader2 className="text-primary size-5 shrink-0 animate-spin" />
					<div>
						<p className="text-foreground text-sm font-semibold">
							Waiting for M-Pesa confirmation
						</p>
						<p className="text-muted-foreground text-xs">
							Check your phone and enter your M-Pesa PIN to complete payment.
						</p>
					</div>
				</div>
			</div>
		);
	}

	// timeout state — prompt expired before the mwajiri responded
	if (state === "timeout") {
		return (
			<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
				<div className="bg-muted/40 flex items-center gap-3 rounded-lg px-4 py-3">
					<XCircle className="text-muted-foreground size-5 shrink-0" />
					<div>
						<p className="text-foreground text-sm font-semibold">
							Payment prompt expired
						</p>
						<p className="text-muted-foreground text-xs">
							The M-Pesa prompt was not responded to in time.
						</p>
					</div>
				</div>
				<Button
					variant="outline"
					onClick={() => {
						setState("idle");
						setErrorMessage(null);
					}}
					className="w-full"
				>
					Try Again
				</Button>
			</div>
		);
	}

	// idle and failed states — payment entry form
	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div className="flex items-center justify-between">
				<div>
					<p className="text-foreground font-semibold">{tier.name} Plan</p>
					<p className="text-muted-foreground text-sm">
						KSh {tier.price.toLocaleString()} ·{" "}
						{formatDuration(tier.durationDays).toLowerCase()}
					</p>
				</div>
				{/* back button lets the mwajiri reconsider their tier choice */}
				<Button
					variant="ghost"
					size="sm"
					onClick={onBack}
					className="text-muted-foreground h-7 gap-1.5 px-2 text-xs"
				>
					<ArrowLeft className="size-3.5" />
					Change plan
				</Button>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="mpesa-phone">M-Pesa Phone Number</Label>
				<Input
					id="mpesa-phone"
					type="tel"
					placeholder="e.g. 0712 345 678"
					value={phoneNumber}
					onChange={(e) => {
						setPhoneNumber(e.target.value);
						setErrorMessage(null);
						if (state === "failed") setState("idle");
					}}
					disabled={state === "submitting"}
				/>
				<p className="text-muted-foreground text-xs">
					An STK push will be sent to this number.
				</p>
			</div>

			{errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}

			<Button
				onClick={handleSubmit}
				disabled={!phoneNumber || state === "submitting"}
				className="w-full"
			>
				{state === "submitting" ? (
					<>
						<Loader2 className="mr-2 size-4 animate-spin" />
						Initiating payment...
					</>
				) : (
					`Pay KSh ${tier.price.toLocaleString()} via M-Pesa`
				)}
			</Button>
		</div>
	);
};

export { SubscriptionPaymentCard };
