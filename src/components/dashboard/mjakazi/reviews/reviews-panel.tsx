import { Star } from "lucide-react";

import { RatingStars } from "@/components/rating-stars";
import { Card, CardContent } from "@/components/ui/card";
import type { WorkerReviewItem } from "@/services/review.service";

type ReviewsPanelProps = {
	reviews: WorkerReviewItem[];
};

const formatDate = (value: string | null): string | null =>
	value
		? new Intl.DateTimeFormat("en-GB", {
				day: "numeric",
				month: "short",
				year: "numeric",
				timeZone: "Africa/Nairobi",
			}).format(new Date(value))
		: null;

// the worker's published reviews. the written feedback is private to the worker
// (and to the mwajiri who wrote it, and to staff) — it is never public. the
// public profile shows only the star average, so there is nothing to hide
const ReviewsPanel = ({ reviews }: ReviewsPanelProps) => {
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
			{reviews.map((review) => {
				const date = formatDate(review.publishedAt);
				return (
					<Card key={review.id}>
						<CardContent className="flex flex-col gap-2 py-4">
							<div className="flex flex-wrap items-center gap-2">
								<RatingStars rating={review.rating} />
								<span className="text-muted-foreground text-xs">
									{review.reviewerName ?? "A mwajiri"}
								</span>
								{date ? (
									<span className="text-muted-foreground text-xs">{date}</span>
								) : null}
							</div>
							<p className="text-foreground text-sm leading-relaxed wrap-break-word">
								{review.comment}
							</p>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};

export { ReviewsPanel };
