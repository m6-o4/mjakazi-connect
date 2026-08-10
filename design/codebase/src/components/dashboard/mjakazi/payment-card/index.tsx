"use client";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Clock, Loader2, PhoneCall, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

// models the full M-Pesa STK push lifecycle as discrete states so each phase
// renders a dedicated panel — avoids boolean flag combinations that could
// produce impossible UI states (e.g. submitting + confirmed simultaneously)
type PaymentState =
	| "idle" // form is ready for input
	| "submitting" // STK push request is in flight
	| "waiting" // prompt delivered — polling /apis/me for a status change
	| "confirmed" // verificationStatus advanced to pending_review
	| "failed" // Safaricom returned an explicit non-success result code
	| "timeout"; // 2-minute polling window elapsed with no confirmation

interface PaymentCardProps {
	// sourced from a server-side platform setting so the displayed amount always
	// matches what Daraja will actually charge — never hardcoded on the client
	registrationFee: number;
}

// how often to hit /apis/me while waiting for the M-Pesa callback to land
const POLL_INTERVAL_MS = 5000;
// give up after 2 minutes — aligns with the typical STK prompt expiry window
const POLL_TIMEOUT_MS = 120000;

const PaymentCard = ({ registrationFee }: PaymentCardProps) => {
	const router = useRouter();

	const [phoneNumber, setPhoneNumber] = useState("");
	const [paymentState, setPaymentState] = useState<PaymentState>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// refs so the polling callbacks can cancel timers without stale-closure issues
	const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	// clears any live timers if the component unmounts before payment resolves
	useEffect(() => {
		return () => {
			if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
			if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
		};
	}, []);

	// polls /apis/me on a fixed interval rather than relying on a webhook push,
	// because the Daraja callback reaches the server — not the browser directly
	const startPolling = () => {
		// cancel any previous polling session before starting a fresh one
		if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
		if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);

		// transitions to timeout if the user never acts on the STK prompt
		pollTimeoutRef.current = setTimeout(() => {
			if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
			setPaymentState("timeout");
		}, POLL_TIMEOUT_MS);

		pollIntervalRef.current = setInterval(async () => {
			try {
				// no-store prevents the browser returning a cached 304 response,
				// which would mask a real status change on the server
				const res = await fetch("/apis/me", { cache: "no-store" });

				if (!res.ok) return; // transient error — retry on the next tick

				const data = await res.json();

				// pending_review means the payment callback ran and advanced the status
				if (data.verificationStatus === "pending_review") {
					if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
					if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
					setPaymentState("confirmed");
					// re-fetch server component data so the page reflects the new
					// pending_review state without requiring a manual reload
					router.refresh();
				}
			} catch {
				// swallow network blips — the interval will retry automatically
			}
		}, POLL_INTERVAL_MS);
	};

	// initiates the STK push and transitions to polling if the server accepts it
	const handleSubmit = async () => {
		setErrorMessage(null);
		setPaymentState("submitting");

		try {
			const res = await fetch("/apis/payments/initiate", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ phoneNumber }),
			});

			const data = await res.json();

			if (!res.ok) {
				// surface the server's message (e.g. invalid number, Daraja rejection)
				setErrorMessage(data.error ?? "Payment initiation failed. Please try again.");
				setPaymentState("idle");
				return;
			}

			setPaymentState("waiting");
			startPolling();
		} catch {
			// true network failure — the STK push request never left the browser
			setErrorMessage(
				"A network error occurred. Please check your connection and try again.",
			);
			setPaymentState("idle");
		}
	};

	// resets state so the user can correct a wrong number or recover from
	// failure or timeout without a full page reload
	const handleRetry = () => {
		if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
		if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
		setPaymentState("idle");
		setErrorMessage(null);
	};

	// shown while the STK prompt is live — reassures the user something is
	// happening without exposing polling internals
	if (paymentState === "waiting") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Loader2 className="text-primary size-5 animate-spin" />
						Waiting for Payment
					</CardTitle>
					<CardDescription>
						An M-Pesa prompt has been sent to <strong>{phoneNumber}</strong>.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						Open your phone, enter your M-Pesa PIN to complete the payment of{" "}
						<strong>KSh {registrationFee.toLocaleString()}</strong>, and this page will
						update automatically.
					</p>
				</CardContent>
				<CardFooter>
					<Button variant="outline" size="sm" onClick={handleRetry}>
						Use a different number
					</Button>
				</CardFooter>
			</Card>
		);
	}

	// terminal success state — no further action required from the user
	if (paymentState === "confirmed") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircle2 className="size-5 text-green-500" />
						Payment Confirmed
					</CardTitle>
					<CardDescription>Your registration fee has been received.</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						Your verification documents are now under review. You will be notified once
						the review is complete.
					</p>
				</CardContent>
			</Card>
		);
	}

	// shown when the polling window closes with no confirmation — kept distinct
	// from "failed" because the transaction may still complete asynchronously;
	// the user should check their M-Pesa messages before retrying
	if (paymentState === "timeout") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="size-5 text-yellow-500" />
						Payment Not Confirmed
					</CardTitle>
					<CardDescription>
						We did not receive a payment confirmation within the expected time.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						This can happen if the M-Pesa prompt was dismissed or timed out. You can try
						again with the same or a different number.
					</p>
				</CardContent>
				<CardFooter>
					<Button onClick={handleRetry}>Try Again</Button>
				</CardFooter>
			</Card>
		);
	}

	// shown when Safaricom explicitly rejects the transaction (wrong PIN,
	// insufficient funds, or user cancellation) — distinct from timeout
	if (paymentState === "failed") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<XCircle className="text-destructive size-5" />
						Payment Failed
					</CardTitle>
					<CardDescription>The M-Pesa transaction was not completed.</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						This may be due to an incorrect PIN, insufficient funds, or a cancelled
						request. Please try again.
					</p>
				</CardContent>
				<CardFooter>
					<Button onClick={handleRetry}>Try Again</Button>
				</CardFooter>
			</Card>
		);
	}

	// default render covers both idle and submitting — button state and input
	// disabled flag communicate progress without needing a separate loading panel
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<PhoneCall className="text-primary size-5" />
					Complete Registration Payment
				</CardTitle>
				<CardDescription>
					Pay the one-time registration fee of{" "}
					<strong>KSh {registrationFee.toLocaleString()}</strong> via M-Pesa to submit
					your profile for review.
				</CardDescription>
			</CardHeader>

			<CardContent className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="mpesa-number">M-Pesa Phone Number</Label>
					<Input
						id="mpesa-number"
						type="tel"
						placeholder="e.g. 0712 345 678"
						value={phoneNumber}
						onChange={(e) => setPhoneNumber(e.target.value)}
						disabled={paymentState === "submitting"}
					/>
					<p className="text-muted-foreground text-xs">
						Enter the number registered to your M-Pesa account. You will receive a payment
						prompt on this number.
					</p>
				</div>

				{errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
			</CardContent>

			<CardFooter>
				<Button
					onClick={handleSubmit}
					disabled={!phoneNumber.trim() || paymentState === "submitting"}
					className="w-full"
				>
					{paymentState === "submitting" ? (
						<>
							<Loader2 className="mr-2 size-4 animate-spin" />
							Sending M-Pesa Details...
						</>
					) : (
						`Pay KSh ${registrationFee.toLocaleString()} via M-Pesa`
					)}
				</Button>
			</CardFooter>
		</Card>
	);
};

export { PaymentCard };
