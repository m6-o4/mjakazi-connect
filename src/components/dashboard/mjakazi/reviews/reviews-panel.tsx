"use client";

import { Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { setReviewVisibilityAction } from "@/app/actions/reviews";
import { RatingStars } from "@/components/rating-stars";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkerReviewItem } from "@/services/review.service";

type ReviewsPanelProps = {
	reviews: WorkerReviewItem[];
};

// the worker's published reviews, shown and hidden. the toggle only changes
// public visibility — a hidden review is still visible here so the worker can
// learn from it, and it stays published (and audited)
const ReviewsPanel = ({ reviews }: ReviewsPanelProps) => {
	const router = useRouter();
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const toggle = async (reviewId: string, hidden: boolean) => {
		setBusyId(reviewId);
		setError(null);
		try {
			const result = await setReviewVisibilityAction({ reviewId, hidden });
			if (!result.success) {
				setError(result.error ?? "Could not update the review.");
				return;
			}
			router.refresh();
		} catch {
			setError("Could not update the review.");
		} finally {
			setBusyId(null);
		}
	};

	if (reviews.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
					<Star className="text-muted-foreground size-6" />
					<p className="text-muted-foreground text-sm">
						No reviews yet. Reviews appear here once a mwajiri reviews you and our team
						approves it.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{error ? <p className="text-destructive text-xs">{error}</p> : null}
			{reviews.map((review) => (
				<Card key={review.id}>
					<CardContent className="flex flex-col gap-2 py-4">
						<div className="flex items-center justify-between gap-3">
							<div className="flex flex-wrap items-center gap-2">
								<RatingStars rating={review.rating} />
								<span className="text-muted-foreground text-xs">
									{review.reviewerName ?? "A mwajiri"}
								</span>
							</div>
							<Button
								type="button"
								variant={review.hidden ? "outline" : "ghost"}
								size="sm"
								onClick={() => toggle(review.id, !review.hidden)}
								disabled={busyId === review.id}
							>
								{review.hidden ? "Show on profile" : "Hide from profile"}
							</Button>
						</div>
						<p className="text-foreground text-sm leading-relaxed wrap-break-word">
							{review.comment}
						</p>
						{review.hidden ? (
							<p className="text-muted-foreground text-xs">
								Hidden from your public profile.
							</p>
						) : null}
					</CardContent>
				</Card>
			))}
		</div>
	);
};

export { ReviewsPanel };
