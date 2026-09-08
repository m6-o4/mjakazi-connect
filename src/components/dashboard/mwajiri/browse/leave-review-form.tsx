"use client";

import { Star } from "lucide-react";
import posthog from "posthog-js";
import { useState } from "react";

import { submitReviewAction } from "@/app/actions/reviews";
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

type LeaveReviewFormProps = {
	mjakaziId: string;
};

const RATINGS = [1, 2, 3, 4, 5];

const ratingLabel = (rating: number): string => {
	const labels: Record<number, string> = {
		1: "Poor",
		2: "Below average",
		3: "Good",
		4: "Very good",
		5: "Excellent",
	};
	return labels[rating] ?? "";
};

// the leave-a-review form for an unlocked + hired worker. the star picker is the
// only client interactivity; the gate (unlock + agreed hire + one per pair) is
// enforced server-side in review.service
const LeaveReviewForm = ({ mjakaziId }: LeaveReviewFormProps) => {
	const [rating, setRating] = useState<number | null>(null);
	const [hovered, setHovered] = useState<number | null>(null);
	const [comment, setComment] = useState("");
	const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		if (rating === null) {
			setError("Pick a star rating.");
			return;
		}
		setStatus("submitting");
		setError(null);
		try {
			const result = await submitReviewAction({ mjakaziId, rating, comment });
			if (!result.success) {
				setError(result.error ?? "Could not submit your review.");
				setStatus("idle");
				return;
			}
			posthog.capture("review_submitted", { rating });
			setStatus("done");
		} catch {
			setError("Could not submit your review.");
			setStatus("idle");
		}
	};

	if (status === "done") {
		return (
			<Card>
				<CardContent className="flex flex-col gap-2 py-6">
					<p className="text-foreground text-sm font-semibold">Review submitted</p>
					<p className="text-muted-foreground text-sm">
						Thanks — your review is with our team for moderation and will appear on this
						profile once approved.
					</p>
				</CardContent>
			</Card>
		);
	}

	const displayed = hovered ?? rating;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Star className="text-accent size-5 shrink-0" />
					Leave a review
				</CardTitle>
				<CardDescription>How was your experience with this wajakazi?</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					<Label>Rating</Label>
					<div className="flex flex-wrap items-center gap-1">
						{RATINGS.map((value) => (
							<button
								key={value}
								type="button"
								onClick={() => setRating(value)}
								onMouseEnter={() => setHovered(value)}
								onMouseLeave={() => setHovered(null)}
								aria-label={`${value} star${value === 1 ? "" : "s"}`}
								className="rounded-sm p-0.5 transition-colors"
							>
								<Star
									className={
										displayed !== null && value <= displayed
											? "text-warning size-6 fill-current"
											: "text-muted-foreground size-6"
									}
								/>
							</button>
						))}
						<span className="text-muted-foreground ml-2 text-sm">
							{rating ? ratingLabel(rating) : "Select a rating"}
						</span>
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="review-comment">Your review</Label>
					<Textarea
						id="review-comment"
						placeholder="Share what it was like to work with them."
						value={comment}
						onChange={(event) => setComment(event.target.value)}
						maxLength={1000}
					/>
				</div>

				{error ? <p className="text-destructive text-xs">{error}</p> : null}

				<Button
					type="button"
					onClick={submit}
					disabled={status === "submitting" || rating === null || !comment.trim()}
				>
					{status === "submitting" ? "Submitting..." : "Submit review"}
				</Button>
			</CardContent>
		</Card>
	);
};

export { LeaveReviewForm };
