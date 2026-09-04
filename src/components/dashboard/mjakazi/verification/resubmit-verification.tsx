"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { resubmitForVerificationAction } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

// the rejected-state resubmit flow. the service re-checks readiness and either
// re-enters review (free resubmissions remaining) or routes back to payment
// (attempts exhausted); this component only delegates and refreshes
const ResubmitVerification = () => {
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const resubmit = async () => {
		setSubmitting(true);
		setError(null);
		try {
			const result = await resubmitForVerificationAction();
			if (!result.success) {
				setError(result.error ?? "Could not resubmit your profile.");
				return;
			}
			posthog.capture("verification_resubmitted");
			router.refresh();
		} catch {
			setError("Could not resubmit your profile.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Resubmit for review</CardTitle>
				<CardDescription>
					Address the reason above, replace any documents if needed, then resubmit for
					another review.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				{error ? <p className="text-destructive text-xs">{error}</p> : null}
				<Button type="button" onClick={resubmit} disabled={submitting}>
					{submitting ? "Resubmitting..." : "Resubmit for review"}
				</Button>
			</CardContent>
		</Card>
	);
};

export { ResubmitVerification };
