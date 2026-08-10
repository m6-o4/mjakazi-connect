"use client";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface VerificationRowActionsProps {
	profileId: string;
}

const VerificationRowActions = ({ profileId }: VerificationRowActionsProps) => {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [done, setDone] = useState(false);
	const [doneLabel, setDoneLabel] = useState("");
	const [showReject, setShowReject] = useState(false);
	const [reason, setReason] = useState("");

	const handleApprove = async () => {
		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/apis/verification/approve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ profileId }),
			});

			if (res.ok) {
				setDoneLabel("Approved");
				setDone(true);
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Approval failed.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const handleReject = async () => {
		if (!reason.trim()) {
			setError("A rejection reason is required.");
			return;
		}

		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/apis/verification/reject", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ profileId, reason: reason.trim() }),
			});

			if (res.ok) {
				setDoneLabel("Rejected");
				setDone(true);
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Rejection failed.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	// once action is complete show a simple confirmation
	if (done) {
		return (
			<div className="bg-muted/40 flex items-center gap-2 rounded-lg px-4 py-2">
				{doneLabel === "Approved" ? (
					<CheckCircle2 className="text-accent size-4" />
				) : (
					<XCircle className="text-destructive size-4" />
				)}
				<span className="text-foreground text-sm font-medium">{doneLabel}</span>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="flex gap-2">
				<Button
					size="sm"
					onClick={handleApprove}
					disabled={loading}
					className="bg-accent text-accent-foreground hover:bg-accent-hover gap-1.5"
				>
					<CheckCircle2 className="size-4" />
					Approve
				</Button>

				<Button
					size="sm"
					variant="outline"
					onClick={() => {
						setShowReject((v) => !v);
						setError(null);
					}}
					disabled={loading}
					className="text-destructive hover:text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5"
				>
					<XCircle className="size-4" />
					Reject
					{showReject ? (
						<ChevronUp className="size-3" />
					) : (
						<ChevronDown className="size-3" />
					)}
				</Button>
			</div>

			{/* rejection reason panel */}
			{showReject && (
				<div className="flex flex-col gap-2">
					<Textarea
						placeholder="State the reason for rejection..."
						value={reason}
						onChange={(e) => setReason(e.target.value)}
						className="min-h-20 text-sm"
					/>
					<Button
						size="sm"
						variant="destructive"
						onClick={handleReject}
						disabled={loading || !reason.trim()}
						className="w-full"
					>
						{loading ? "Submitting..." : "Confirm Rejection"}
					</Button>
				</div>
			)}

			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
};

export { VerificationRowActions };
