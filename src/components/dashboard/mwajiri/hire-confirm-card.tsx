"use client";

import { Handshake } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { confirmHireAction, endHireAction, reverseHireAction } from "@/app/actions/hire";
import { LeaveReviewForm } from "@/components/dashboard/mwajiri/browse/leave-review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type HireCandidate = {
	mjakaziId: string;
	displayName: string;
	location: string | null;
	sourceEoiId: string | null;
};

type HireItem = {
	id: string;
	mjakaziId: string;
	counterpartyName: string;
	state: "pending_agreement" | "agreed" | "ended";
	awaitingYou: boolean;
	reviewed: boolean;
};

type HireConfirmCardProps = {
	candidates: HireCandidate[];
	hires: HireItem[];
};

// the mwajiri hire-confirmation card. candidates (accepted interests + unlocked
// wajakazi) can be marked as hired; active hires show their agreement state and
// can be agreed to or reversed. the hire is recorded against the active
// subscription and flips the wajakazi to hired immediately.
const HireConfirmCard = ({ candidates, hires }: HireConfirmCardProps) => {
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [reviewingId, setReviewingId] = useState<string | null>(null);

	const run = async (
		key: string,
		action: () => Promise<{ success: boolean; error?: string }>,
	) => {
		setBusy(key);
		setError(null);
		try {
			const result = await action();
			if (!result.success) {
				setError(result.error ?? "Something went wrong.");
				return;
			}
			posthog.capture("hire_confirmed", { confirmedBy: "mwajiri" });
			router.refresh();
		} finally {
			setBusy(null);
		}
	};

	const markHired = (candidate: HireCandidate) =>
		run(`mark-${candidate.mjakaziId}`, () =>
			confirmHireAction({
				mjakaziId: candidate.mjakaziId,
				sourceEoiId: candidate.sourceEoiId,
			}),
		);

	const agree = (hire: HireItem) =>
		run(`agree-${hire.id}`, () => confirmHireAction({ mjakaziId: hire.mjakaziId }));

	const reverse = async (hire: HireItem) => {
		setBusy(`reverse-${hire.id}`);
		setError(null);
		try {
			const result = await reverseHireAction({ hireId: hire.id });
			if (!result.success) {
				setError(result.error ?? "Could not reverse the hire.");
				return;
			}
			router.refresh();
		} finally {
			setBusy(null);
		}
	};

	// ends a completed contract, then opens the review form for that wajakazi in
	// place so the mwajiri can leave a review of the finished engagement
	const endContract = async (hire: HireItem) => {
		setBusy(`end-${hire.id}`);
		setError(null);
		try {
			const result = await endHireAction({ hireId: hire.id });
			if (!result.success) {
				setError(result.error ?? "Could not end the contract.");
				return;
			}
			posthog.capture("hire_ended", { endedBy: "mwajiri" });
			setReviewingId(hire.mjakaziId);
			router.refresh();
		} finally {
			setBusy(null);
		}
	};

	const isEmpty = candidates.length === 0 && hires.length === 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Handshake className="text-accent size-5 shrink-0" />
					Confirm a hire
				</CardTitle>
				<CardDescription>
					Record when a wajakazi you have been in contact with is hired.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				{isEmpty ? (
					<p className="text-muted-foreground text-sm">
						Once you accept an interest or unlock a contact, you will be able to confirm a
						hire here.
					</p>
				) : null}

				{candidates.length > 0 ? (
					<div className="flex flex-col gap-2">
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Mark as hired
						</p>
						{candidates.map((candidate) => (
							<div
								key={candidate.mjakaziId}
								className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
							>
								<div className="flex flex-col">
									<span className="text-sm font-medium">{candidate.displayName}</span>
									{candidate.location ? (
										<span className="text-muted-foreground text-xs">
											{candidate.location}
										</span>
									) : null}
								</div>
								<Button
									type="button"
									size="sm"
									onClick={() => markHired(candidate)}
									disabled={busy === `mark-${candidate.mjakaziId}`}
								>
									{busy === `mark-${candidate.mjakaziId}`
										? "Recording…"
										: "Mark as hired"}
								</Button>
							</div>
						))}
					</div>
				) : null}

				{hires.length > 0 ? (
					<div className="flex flex-col gap-2">
						<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
							Your hires
						</p>
						{hires.map((hire) => (
							<div
								key={hire.id}
								className="border-border flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-sm font-medium">{hire.counterpartyName}</span>
									{hire.state === "agreed" ? (
										<Badge>Hired</Badge>
									) : hire.state === "ended" ? (
										<Badge variant="secondary">Completed</Badge>
									) : hire.awaitingYou ? (
										<Badge variant="secondary">Confirming</Badge>
									) : (
										<Badge variant="outline">Awaiting their agreement</Badge>
									)}
								</div>
								<div className="flex flex-wrap gap-2">
									{hire.awaitingYou ? (
										<Button
											type="button"
											size="sm"
											onClick={() => agree(hire)}
											disabled={busy === `agree-${hire.id}`}
										>
											{busy === `agree-${hire.id}` ? "Confirming…" : "Agree"}
										</Button>
									) : null}

									{hire.state === "agreed" ? (
										<Button
											type="button"
											size="sm"
											onClick={() => endContract(hire)}
											disabled={busy === `end-${hire.id}`}
										>
											{busy === `end-${hire.id}` ? "Ending…" : "End contract"}
										</Button>
									) : null}

									{hire.state === "ended" && !hire.reviewed ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => setReviewingId(hire.mjakaziId)}
										>
											Leave a review
										</Button>
									) : null}

									{hire.reviewed ? <Badge variant="outline">Reviewed</Badge> : null}

									{hire.state === "pending_agreement" ? (
										<Button
											type="button"
											size="sm"
											variant="outline"
											onClick={() => reverse(hire)}
											disabled={busy === `reverse-${hire.id}`}
										>
											{hire.awaitingYou ? "Not correct" : "Reverse"}
										</Button>
									) : null}
								</div>
							</div>
						))}

						{reviewingId ? <LeaveReviewForm mjakaziId={reviewingId} /> : null}
					</div>
				) : null}

				{error ? <p className="text-destructive text-xs">{error}</p> : null}
			</CardContent>
		</Card>
	);
};

export { HireConfirmCard };
