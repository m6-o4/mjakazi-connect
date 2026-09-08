import { RatingStars } from "@/components/rating-stars";
import type { PublicReviews } from "@/services/review.service";

type ProfileReviewsProps = {
	reviews: PublicReviews;
};

const formatDate = (value: string): string =>
	new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "Africa/Nairobi",
	}).format(new Date(value));

// the published, worker-visible reviews on a public profile. nothing renders
// when there are none — hidden reviews are already excluded by the service, and
// the aggregate reflects only what the worker chose to show
const ProfileReviews = ({ reviews }: ProfileReviewsProps) => {
	if (reviews.count === 0) return null;

	const averageLabel = reviews.average !== null ? reviews.average.toFixed(1) : "—";

	return (
		<section className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<h2 className="text-heading text-lg font-semibold">Reviews</h2>
				<div className="flex items-center gap-2">
					<RatingStars rating={reviews.average ?? 0} />
					<span className="text-muted-foreground text-sm">
						{averageLabel} · {reviews.count} {reviews.count === 1 ? "review" : "reviews"}
					</span>
				</div>
			</div>

			<div className="flex flex-col gap-3">
				{reviews.reviews.map((review, index) => (
					<div
						key={index}
						className="bg-card border-border flex flex-col gap-2 rounded-lg border p-4"
					>
						<div className="flex flex-wrap items-center gap-2">
							<RatingStars rating={review.rating} />
							<span className="text-foreground text-sm font-semibold">
								{review.reviewerName ?? "A mwajiri"}
							</span>
							{review.publishedAt ? (
								<span className="text-muted-foreground text-xs">
									{formatDate(review.publishedAt)}
								</span>
							) : null}
						</div>
						<p className="text-foreground text-sm leading-relaxed wrap-break-word">
							{review.comment}
						</p>
					</div>
				))}
			</div>
		</section>
	);
};

export { ProfileReviews };
