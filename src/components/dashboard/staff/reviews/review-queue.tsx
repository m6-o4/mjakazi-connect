"use client";

import { Clock, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { approveReviewAction, rejectReviewAction } from "@/app/actions/reviews";
import { RatingStars } from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import type { PendingReviewItem } from "@/services/review.service";

type ReviewQueueProps = {
	items: PendingReviewItem[];
};

const formatDate = (value: string): string =>
	new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "Africa/Nairobi",
	}).format(new Date(value));

// the pending moderation list. approve publishes, reject requires a reason and
// is terminal — the queue re-fetches after each decision
const ReviewQueue = ({ items }: ReviewQueueProps) => {
	const router = useRouter();
	const [busyId, setBusyId] = useState<string | null>(null);
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | null>(null);

	const approve = async (id: string) => {
		setBusyId(id);
		setError(null);
		try {
			const result = await approveReviewAction(id);
			if (!result.success) {
				setError(result.error ?? "Could not approve the review.");
				return;
			}
			router.refresh();
		} catch {
			setError("Could not approve the review.");
		} finally {
			setBusyId(null);
		}
	};

	const confirmReject = async (id: string) => {
		if (!reason.trim()) {
			setError("A rejection reason is required.");
			return;
		}
		setBusyId(id);
		setError(null);
		try {
			const result = await rejectReviewAction(id, reason);
			if (!result.success) {
				setError(result.error ?? "Could not reject the review.");
				return;
			}
			setRejectingId(null);
			setReason("");
			router.refresh();
		} catch {
			setError("Could not reject the review.");
		} finally {
			setBusyId(null);
		}
	};

	if (items.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
				<Inbox className="text-muted-foreground size-6" />
				<p className="text-foreground mt-3 text-base font-semibold">Queue is clear</p>
				<p className="text-muted-foreground mt-1 text-sm">
					No reviews are awaiting moderation right now.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{error ? <p className="text-destructive text-xs">{error}</p> : null}
			{items.map((item) => (
				<Card key={item.id}>
					<CardContent className="flex flex-col gap-3 py-4">
						<div className="flex items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<RatingStars rating={item.rating} />
								<span className="text-foreground text-sm font-semibold">
									{item.reviewerName ?? "A mwajiri"}
								</span>
								<span className="text-muted-foreground text-xs">
									reviewing {item.mjakaziDisplayName ?? "a wajakazi"}
								</span>
							</div>
							<div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
								<Clock className="size-3.5" />
								{item.submittedAt
									? `Submitted ${formatDate(item.submittedAt)}`
									: "Submitted"}
							</div>
						</div>

						<p className="text-foreground text-sm leading-relaxed wrap-break-word">
							{item.comment}
						</p>

						{rejectingId === item.id ? (
							<div className="flex flex-col gap-2">
								<Textarea
									placeholder="Why is this review being rejected?"
									value={reason}
									onChange={(event) => setReason(event.target.value)}
								/>
								<div className="flex gap-2">
									<Button
										type="button"
										size="sm"
										onClick={() => confirmReject(item.id)}
										disabled={busyId === item.id}
									>
										Confirm rejection
									</Button>
									<Button
										type="button"
										size="sm"
										variant="ghost"
										onClick={() => {
											setRejectingId(null);
											setReason("");
										}}
										disabled={busyId === item.id}
									>
										Cancel
									</Button>
								</div>
							</div>
						) : (
							<div className="flex gap-2">
								<Button
									type="button"
									size="sm"
									onClick={() => approve(item.id)}
									disabled={busyId === item.id}
								>
									Approve
								</Button>
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => {
										setRejectingId(item.id);
										setReason("");
									}}
									disabled={busyId === item.id}
								>
									Reject
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
};

export { ReviewQueue };
