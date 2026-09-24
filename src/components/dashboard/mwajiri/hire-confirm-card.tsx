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
import { notifySuccess } from "@/lib/notify";

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

const sectionLabel =
	"text-muted-foreground text-xs font-semibold tracking-wide uppercase";

// the mwajiri hire card, split by state so every row offers one valid action and
// nothing else: people who can still be hired, hires still in progress, and past
// (completed) hires. recording a hire is confirmed inline — it flips the mjakazi
// to hired and opens a hire awaiting their agreement, so a stray click should not
// start one. a completed hire never returns to "ready to hire"; only a reversed
// hire ("did not hold") frees the pair to record a new one
const HireConfirmCard = ({ candidates, hires }: HireConfirmCardProps) => {
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [reviewingId, setReviewingId] = useState<string | null>(null);
	const [confirmingId, setConfirmingId] = useState<string | null>(null);

	const run = async (
		key: string,
		action: () => Promise<{ success: boolean; error?: string }>,
		successMessage: string,
	): Promise<boolean> => {
		setBusy(key);
		setError(null);
		try {
			const result = await action();
			if (!result.success) {
				setError(result.error ?? "Something went wrong.");
				return false;
			}
			posthog.capture("hire_confirmed", { confirmedBy: "mwajiri" });
			notifySuccess(successMessage, { id: `hire-${key}` });
			router.refresh();
			return true;
		} finally {
			setBusy(null);
		}
	};

	const markHired = async (candidate: HireCandidate) => {
		const ok = await run(
			`mark-${candidate.mjakaziId}`,
			() =>
				confirmHireAction({
					mjakaziId: candidate.mjakaziId,
					sourceEoiId: candidate.sourceEoiId,
				}),
			"Hire recorded",
		);
		if (ok) setConfirmingId(null);
	};

	const agree = (hire: HireItem) =>
		run(
			`agree-${hire.id}`,
			() => confirmHireAction({ mjakaziId: hire.mjakaziId }),
			"Hire confirmed",
		);

	const reverse = async (hire: HireItem) => {
		setBusy(`reverse-${hire.id}`);
		setError(null);
		try {
			const result = await reverseHireAction({ hireId: hire.id });
			if (!result.success) {
				setError(result.error ?? "Could not reverse the hire.");
				return;
			}
			notifySuccess("Hire reversed", { id: `hire-reverse-${hire.id}` });
			router.refresh();
		} finally {
			setBusy(null);
		}
	};

	// ends a completed contract, then opens the review form for that mjakazi in
	// place so the mwajiri can review the finished engagement
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
			notifySuccess("Contract ended", { id: `hire-end-${hire.id}` });
			setReviewingId(hire.mjakaziId);
			router.refresh();
		} finally {
			setBusy(null);
		}
	};

	const activeHires = hires.filter((hire) => hire.state !== "ended");
	const pastHires = hires.filter((hire) => hire.state === "ended");
	const isEmpty = candidates.length === 0 && hires.length === 0;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Handshake className="text-accent size-5 shrink-0" />
					Confirm a hire
				</CardTitle>
				<CardDescription>
					Record when a mjakazi you have been in contact with is hired.
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
						<p className={sectionLabel}>Ready to hire</p>
						{candidates.map((candidate) => (
							<div
								key={candidate.mjakaziId}
								className="border-border flex flex-col gap-3 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex flex-col">
									<span className="text-sm font-medium">{candidate.displayName}</span>
									{candidate.location ? (
										<span className="text-muted-foreground text-xs">
											{candidate.location}
										</span>
									) : null}
								</div>

								{confirmingId === candidate.mjakaziId ? (
									<div className="flex flex-col gap-2 sm:items-end">
										<p className="text-muted-foreground text-xs sm:text-right">
											Record that you hired {candidate.displayName}? This awaits their
											confirmation.
										</p>
										<div className="flex gap-2">
											<Button
												type="button"
												size="sm"
												onClick={() => markHired(candidate)}
												disabled={busy === `mark-${candidate.mjakaziId}`}
											>
												{busy === `mark-${candidate.mjakaziId}`
													? "Recording…"
													: "Confirm hire"}
											</Button>
											<Button
												type="button"
												size="sm"
												variant="outline"
												onClick={() => setConfirmingId(null)}
												disabled={busy === `mark-${candidate.mjakaziId}`}
											>
												Cancel
											</Button>
										</div>
									</div>
								) : (
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => setConfirmingId(candidate.mjakaziId)}
									>
										Record hire
									</Button>
								)}
							</div>
						))}
					</div>
				) : null}

				{activeHires.length > 0 ? (
					<div className="flex flex-col gap-2">
						<p className={sectionLabel}>Active hires</p>
						{activeHires.map((hire) => (
							<div
								key={hire.id}
								className="border-border flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-sm font-medium">{hire.counterpartyName}</span>
									{hire.state === "agreed" ? (
										<Badge>Hired</Badge>
									) : hire.awaitingYou ? (
										<Badge variant="secondary">They confirmed</Badge>
									) : (
										<Badge variant="outline">Awaiting their confirmation</Badge>
									)}
								</div>
								<div className="flex flex-wrap gap-2">
									{hire.state === "pending_agreement" && hire.awaitingYou ? (
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
					</div>
				) : null}

				{pastHires.length > 0 ? (
					<div className="flex flex-col gap-2">
						<p className={sectionLabel}>Past hires</p>
						{pastHires.map((hire) => (
							<div
								key={hire.id}
								className="border-border flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-muted-foreground text-sm font-medium">
										{hire.counterpartyName}
									</span>
									<Badge variant="secondary">Completed</Badge>
									{hire.reviewed ? <Badge variant="outline">Reviewed</Badge> : null}
								</div>
								{!hire.reviewed ? (
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => setReviewingId(hire.mjakaziId)}
									>
										Leave a review
									</Button>
								) : null}
							</div>
						))}
					</div>
				) : null}

				{reviewingId ? <LeaveReviewForm mjakaziId={reviewingId} /> : null}

				{error ? <p className="text-destructive text-xs">{error}</p> : null}
			</CardContent>
		</Card>
	);
};

export { HireConfirmCard };
