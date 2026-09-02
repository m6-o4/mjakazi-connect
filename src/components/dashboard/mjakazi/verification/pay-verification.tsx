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

type PayVerificationProps = {
	fee: number | null;
};

const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 150000;

// the pending_payment pay flow. sends the stk push via the server action, then
// polls for the callback to flip the profile into review. the page server
// component re-renders on router.refresh(), so once the state changes this
// component unmounts and the review status takes its place
const PayVerification = ({ fee }: PayVerificationProps) => {
	const router = useRouter();
	const [status, setStatus] = useState<"idle" | "paying" | "awaiting" | "timedOut">(
		"idle",
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (status !== "awaiting") return;

		const interval = setInterval(() => router.refresh(), POLL_INTERVAL_MS);
		const timeout = setTimeout(() => {
			clearInterval(interval);
			setStatus("timedOut");
		}, POLL_TIMEOUT_MS);

		return () => {
			clearInterval(interval);
			clearTimeout(timeout);
		};
	}, [status, router]);

	const pay = async () => {
		setStatus("paying");
		setError(null);
		try {
			const result = await initiateVerificationPaymentAction();
			if (!result.success) {
				setError(result.error ?? "Could not start the payment.");
				setStatus("idle");
				return;
			}
			posthog.capture("payment_initiated", { paymentType: "verification" });
			setStatus("awaiting");
		} catch {
			setError("Could not start the payment.");
			setStatus("idle");
		}
	};

	const disabled = fee === null || status === "paying";

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

				{status === "timedOut" ? (
					<p className="text-muted-foreground text-sm">
						We have not received a confirmation yet. Your request may have expired — try
						again.
					</p>
				) : null}

				{error ? <p className="text-destructive text-xs">{error}</p> : null}

				{status !== "awaiting" ? (
					<Button type="button" onClick={pay} disabled={disabled}>
						{status === "paying"
							? "Sending request..."
							: fee === null
								? "Fee not configured"
								: `Pay KSh ${fee}`}
					</Button>
				) : null}
			</CardContent>
		</Card>
	);
};

export { PayVerification };
