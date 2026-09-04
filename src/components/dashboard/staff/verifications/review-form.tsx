"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import {
	approveVerificationAction,
	rejectVerificationAction,
} from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type ReviewFormProps = {
	profileId: string;
	verificationSubmittedAt: string | null;
	verificationAttempts: number | null;
};

// the staff decision form. reject requires a reason (which is surfaced to the
// worker). on success the reviewer is returned to the queue, which no longer shows
// the profile. the service re-checks role, state and reason, so this is a courtesy
const ReviewForm = ({
	profileId,
	verificationSubmittedAt,
	verificationAttempts,
}: ReviewFormProps) => {
	const router = useRouter();
	const [reason, setReason] = useState("");
	const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
	const [error, setError] = useState<string | null>(null);

	const approve = async () => {
		setBusy("approve");
		setError(null);
		try {
			const result = await approveVerificationAction(profileId);
			if (!result.success) {
				setError(result.error ?? "Could not approve.");
				return;
			}
			if (verificationSubmittedAt !== null) {
				const daysToVerify = Math.max(
					0,
					Math.floor(
						(Date.now() - new Date(verificationSubmittedAt).getTime()) / 86_400_000,
					),
				);
				posthog.capture("verification_approved", { daysToVerify });
			} else {
				posthog.capture("verification_approved");
			}
			router.push("/dashboard/staff/verifications");
			router.refresh();
		} catch (error) {
			console.error("[review-form] approve failed:", error);
			setError("Could not approve.");
		} finally {
			setBusy(null);
		}
	};

	const reject = async () => {
		if (!reason.trim()) {
			setError("A rejection reason is required.");
			return;
		}
		setBusy("reject");
		setError(null);
		try {
			const result = await rejectVerificationAction(profileId, reason.trim());
			if (!result.success) {
				setError(result.error ?? "Could not reject.");
				return;
			}
			posthog.capture("verification_rejected", {
				attempt: (verificationAttempts ?? 0) + 1,
			});
			router.push("/dashboard/staff/verifications");
			router.refresh();
		} catch (error) {
			console.error("[review-form] reject failed:", error);
			setError("Could not reject.");
		} finally {
			setBusy(null);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Decision</CardTitle>
				<CardDescription>
					Check the legal name against the documents, then approve or reject.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="rejection-reason">Rejection reason</Label>
					<Textarea
						id="rejection-reason"
						value={reason}
						onChange={(event) => setReason(event.target.value)}
						placeholder="Required to reject — shown to the worker"
						rows={3}
					/>
				</div>

				{error && <p className="text-destructive text-xs">{error}</p>}

				<div className="flex flex-col gap-2 sm:flex-row">
					<Button type="button" onClick={approve} disabled={busy !== null}>
						{busy === "approve" ? "Approving..." : "Approve"}
					</Button>
					<Button
						type="button"
						variant="destructive"
						onClick={reject}
						disabled={busy !== null}
					>
						{busy === "reject" ? "Rejecting..." : "Reject"}
					</Button>
				</div>
			</CardContent>
		</Card>
	);
};

export { ReviewForm };
