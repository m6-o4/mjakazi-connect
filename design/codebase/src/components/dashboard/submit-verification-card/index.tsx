"use client";

import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

interface SubmitVerificationCardProps {
	verificationStatus: string;
	documentsReady: boolean;
	// populated when the mjakazi has been rejected — shown inline so they
	// know exactly what to correct before resubmitting
	rejectionReason?: string | null;
	// how many times the mjakazi has been rejected — used to derive
	// how many attempts remain before the cap is reached
	verificationAttempts?: number;
	// the maximum number of rejections allowed before resubmission is blocked
	maxAttempts?: number;
}

// states where verification has already been acted on — the mjakazi cannot
// initiate a new submission while in any of these states
const nonSubmittableStates = [
	"pending_payment",
	"pending_review",
	"verified",
	"blacklisted",
	"deactivated",
];

// button copy for states where submission is blocked but the user still needs
// to understand why rather than seeing a generic disabled label
const buttonLabelMap: Record<string, string> = {
	pending_payment: "Awaiting Payment",
	pending_review: "Under Review",
	verified: "Verification Complete",
	blacklisted: "Account Restricted",
	deactivated: "Account Deactivated",
};

// contextual feedback shown in the status banner for each lifecycle state
// tone drives the background colour so the visual weight matches the severity
const statusContextMap: Record<
	string,
	{ icon: ReactNode; message: string; tone: string }
> = {
	pending_payment: {
		icon: <Clock className="size-5 shrink-0 text-amber-500" />,
		message: "Payment is being processed. Your documents will be reviewed shortly.",
		tone: "bg-amber-50 dark:bg-amber-950/30",
	},
	pending_review: {
		icon: <Clock className="text-primary size-5 shrink-0" />,
		message: "Your documents are under admin review. We will notify you of the outcome.",
		tone: "bg-primary/5",
	},
	verified: {
		icon: <CheckCircle2 className="text-accent size-5 shrink-0" />,
		message: "Your profile is verified and publicly visible to Waajiri.",
		tone: "bg-accent/10",
	},
	rejected: {
		icon: <AlertCircle className="text-destructive size-5 shrink-0" />,
		message:
			"Your verification was rejected. Please review the reason below, correct your documents, and resubmit.",
		tone: "bg-destructive/5",
	},
	verification_expired: {
		icon: <AlertCircle className="text-destructive size-5 shrink-0" />,
		message:
			"Your verification has expired. Upload a new Certificate of Good Conduct to resubmit.",
		tone: "bg-destructive/5",
	},
	blacklisted: {
		icon: <AlertCircle className="text-destructive size-5 shrink-0" />,
		message: "Your account has been restricted. Please contact support.",
		tone: "bg-destructive/5",
	},
	deactivated: {
		icon: <AlertCircle className="text-destructive size-5 shrink-0" />,
		message: "Your account has been deactivated. Please contact support.",
		tone: "bg-destructive/5",
	},
};

const SubmitVerificationCard = ({
	verificationStatus,
	documentsReady,
	rejectionReason,
	verificationAttempts = 0,
	maxAttempts = 3,
}: SubmitVerificationCardProps) => {
	const router = useRouter();

	// local state tracks only the in-flight submission cycle
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const alreadySubmitted = nonSubmittableStates.includes(verificationStatus);
	const blockedLabel = buttonLabelMap[verificationStatus];
	const statusContext = statusContextMap[verificationStatus];

	// mjakazi has hit the attempt cap — contact support is now the only path
	const attemptsExhausted =
		verificationStatus === "rejected" && verificationAttempts >= maxAttempts;

	const attemptsRemaining = maxAttempts - verificationAttempts;

	// button is disabled whenever proceeding would produce an invalid or no-op result
	const isDisabled =
		loading || success || alreadySubmitted || !documentsReady || attemptsExhausted;

	// label priority reflects the most actionable state the mjakazi is in
	const buttonLabel = attemptsExhausted
		? "No Attempts Remaining"
		: alreadySubmitted
			? blockedLabel
			: !documentsReady
				? "Upload Required Documents"
				: success
					? "Submitted"
					: loading
						? "Submitting..."
						: "Submit Verification";

	// fires a POST to the verification submit route and surfaces any errors inline
	// on success, router.refresh() re-fetches server component data so the payment
	// card becomes visible without requiring a manual reload
	const handleSubmit = async () => {
		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/apis/verification/submit", {
				method: "POST",
			});

			if (res.ok) {
				setSuccess(true);
				router.refresh();
			} else {
				const data = await res.json();
				setError(data?.error ?? "Submission failed. Please try again.");
			}
		} catch {
			setError("Network error. Please check your connection.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div>
				<p className="text-muted-foreground text-sm font-semibold">Submit Verification</p>
				<p className="text-muted-foreground text-sm">
					Once submitted, your documents will be reviewed by an administrator.
				</p>
			</div>

			{/* lifecycle-aware status banner — only shown when the state has feedback to surface */}
			{statusContext && (
				<div
					className={`flex items-start gap-3 rounded-lg px-4 py-3 ${statusContext.tone}`}
				>
					{statusContext.icon}
					<p className="text-foreground text-sm leading-relaxed">
						{statusContext.message}
					</p>
				</div>
			)}

			{/* rejection reason — shown so the mjakazi knows exactly what to correct */}
			{verificationStatus === "rejected" && rejectionReason && (
				<div className="border-destructive/30 bg-destructive/5 flex flex-col gap-1 rounded-lg border px-4 py-3">
					<p className="text-destructive text-xs font-semibold tracking-wide uppercase">
						Reason for Rejection
					</p>
					<p className="text-foreground text-sm leading-relaxed">{rejectionReason}</p>
				</div>
			)}

			{/* remaining attempts counter — sets the expectation before the cap is hit */}
			{verificationStatus === "rejected" && !attemptsExhausted && (
				<p className="text-muted-foreground text-xs">
					You have{" "}
					<span className="text-foreground font-medium">
						{attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
					</span>{" "}
					before your account is locked from resubmission.
				</p>
			)}

			{/* shown when the cap is reached — contact support is the only remaining option */}
			{attemptsExhausted && (
				<div className="border-destructive/30 bg-destructive/5 flex items-start gap-3 rounded-lg border px-4 py-3">
					<AlertCircle className="text-destructive mt-0.5 size-5 shrink-0" />
					<p className="text-foreground text-sm leading-relaxed">
						You have reached the maximum number of verification attempts. Please contact
						support to discuss your account.
					</p>
				</div>
			)}

			{/* resubmission payment notice — sets the expectation that each submission
			    triggers a new M-Pesa charge as per the Terms of Service */}
			{verificationStatus === "rejected" && !attemptsExhausted && documentsReady && (
				<div className="border-border bg-muted/40 flex items-start gap-3 rounded-lg border px-4 py-3">
					<AlertCircle className="text-muted-foreground mt-0.5 size-4 shrink-0" />
					<p className="text-muted-foreground text-xs leading-relaxed">
						Please note: as outlined in our Terms of Service, each verification submission
						requires a new registration fee payment. Resubmitting will initiate a new
						M-Pesa payment.
					</p>
				</div>
			)}

			{/* nudge to upload both documents before the submit button becomes active */}
			{!documentsReady && !alreadySubmitted && !attemptsExhausted && (
				<div className="border-border bg-muted/40 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-5 text-center">
					<AlertCircle className="text-muted-foreground size-5" />
					<span className="text-muted-foreground text-sm">
						Upload both documents to enable submission
					</span>
					<span className="text-muted-foreground/60 text-xs">
						National ID and Certificate of Good Conduct
					</span>
				</div>
			)}

			<Button onClick={handleSubmit} disabled={isDisabled} className="w-full gap-2">
				{buttonLabel}
			</Button>

			{error && <p className="text-destructive text-sm">{error}</p>}

			{success && (
				<p className="text-accent text-sm">
					Your verification has been submitted for review.
				</p>
			)}
		</div>
	);
};

export { SubmitVerificationCard };
