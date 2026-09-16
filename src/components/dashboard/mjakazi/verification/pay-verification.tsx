"use client";

import { Loader2, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

import { initiateVerificationPaymentAction } from "@/app/actions/payment";
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

type PayVerificationProps = {
	fee: number | null;
	phone: string;
	// reports that an stk push was accepted for this profile, so the
	// always-mounted parent (VerificationPaymentFlow) can show its success cue
	// once the profile leaves pending_payment. reported once and never retracted:
	// a cue gated on the spinner instead disappears the moment the confirm window
	// passes, so a callback arriving after that is met with no notice at all —
	// not even the one that is meant to be the persistent record
	onPaymentInitiated?: () => void;
};

const POLL_INTERVAL_MS = 5000;
// once the window has passed the card says it is still checking, so the cadence
// drops rather than the check stopping — a forgotten tab must not poll every five
// seconds forever
const SLOW_POLL_INTERVAL_MS = 30000;
// how long the card claims to be waiting on the handset before the copy admits
// the window has passed. polling does not stop here
const SPINNER_WINDOW_MS = 150000;

// the pending_payment pay flow. the phone defaults to the profile number but is
// editable, so a mjakazi can pay from any m-pesa number. sends the stk push via
// the server action, then polls for the callback to flip the profile into
// review. the page server component re-renders on router.refresh(), so once the
// state changes this component unmounts and the review status takes its place
const PayVerification = ({ fee, phone, onPaymentInitiated }: PayVerificationProps) => {
	const router = useRouter();
	const [phoneValue, setPhoneValue] = useState<string>(phone);
	const [status, setStatus] = useState<"idle" | "paying" | "awaiting" | "unconfirmed">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);

	// poll for as long as a push is outstanding, the passed window included. the
	// server expires a payment it never hears about, but it still accepts a late
	// callback, so giving up on the clock alone would miss a real confirmation
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
		setStatus("paying");
		setError(null);
		try {
			const result = await initiateVerificationPaymentAction({ phone: phoneValue });
			if (!result.success) {
				setError(result.error ?? "Could not start the payment.");
				setStatus("idle");
				return;
			}
			posthog.capture("payment_initiated", { paymentType: "verification" });
			onPaymentInitiated?.();
			setStatus("awaiting");
		} catch {
			setError("Could not start the payment.");
			setStatus("idle");
		}
	};

	const disabled = fee === null || !phoneValue.trim() || status === "paying";

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Smartphone className="text-accent size-5 shrink-0" />
					Pay the verification fee
				</CardTitle>
				<CardDescription>
					{fee === null
						? "The verification fee is not configured yet."
						: `A one-time fee of KSh ${fee} covers our team reviewing your documents.`}
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

				{status === "awaiting" ? (
					<div className="text-muted-foreground flex flex-col gap-2 text-sm">
						<div className="flex items-center gap-2">
							<Loader2 className="size-4 animate-spin" />
							Waiting for your M-Pesa confirmation…
						</div>
						<p>
							Check your phone and enter your M-Pesa PIN. This page updates automatically.
						</p>
					</div>
				) : null}

				{status === "unconfirmed" ? (
					<div className="flex flex-col gap-2 text-sm">
						<p className="text-muted-foreground">
							M-Pesa has not confirmed this payment yet, so your profile has not moved on
							to review. This page is still checking.
						</p>
						<p>
							If the fee has already left your M-Pesa, do not pay again — the payment is
							recorded against your account and can be traced with your M-Pesa reference.
						</p>
					</div>
				) : null}

				{error ? <p className="text-destructive text-xs">{error}</p> : null}

				{status !== "awaiting" && status !== "unconfirmed" ? (
					<Button type="button" onClick={pay} disabled={disabled}>
						{status === "paying"
							? "Sending request..."
							: fee === null
								? "Fee not configured"
								: `Pay KSh ${fee}`}
					</Button>
				) : null}

				{status === "unconfirmed" ? (
					<Button type="button" variant="outline" onClick={() => router.refresh()}>
						Check again
					</Button>
				) : null}
			</CardContent>
		</Card>
	);
};

export { PayVerification };
