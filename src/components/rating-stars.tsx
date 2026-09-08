import { Star } from "lucide-react";

type RatingStarsProps = {
	rating: number;
};

// read-only star display — filled stars use the warning token (golden amber),
// empty ones sit in muted. the interactive picker lives in the review form
const RatingStars = ({ rating }: RatingStarsProps) => {
	const rounded = Math.max(0, Math.min(5, Math.round(rating)));

	return (
		<span
			className="inline-flex items-center gap-0.5"
			aria-label={`${rating} out of 5 stars`}
		>
			{Array.from({ length: 5 }, (_, index) => (
				<Star
					key={index}
					className={
						index < rounded
							? "text-warning size-4 fill-current"
							: "text-muted-foreground size-4"
					}
				/>
			))}
		</span>
	);
};

export { RatingStars };
