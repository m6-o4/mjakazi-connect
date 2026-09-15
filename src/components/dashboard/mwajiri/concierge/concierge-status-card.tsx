"use client";

import {
	CheckCircle2,
	Clock,
	Crown,
	FileText,
	Loader2,
	RefreshCw,
	UserCheck,
} from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import {
	recordConciergeOutcomeAction,
	requestConciergeReplacementAction,
} from "@/app/actions/concierge";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { notifySuccess } from "@/lib/notify";
import type { ConciergeCase, WajakaziProfile } from "@/payload-types";

type ShortlistCandidate = {
	candidate: WajakaziProfile | string;
	matchNote?: string | null;
};

type Props = {
	conciergeCase: ConciergeCase;
	eligibleForReplacement?: boolean;
};

const ConciergeStatusCard = ({
	conciergeCase,
	eligibleForReplacement = false,
}: Props) => {
	const [isPending, startTransition] = useTransition();
	const [actionError, setActionError] = useState<string | null>(null);

	const state = conciergeCase.state ?? "intake";

	const handleRecordOutcome = (outcome: "hired" | "none_suitable") => {
		setActionError(null);
		startTransition(async () => {
			const res = await recordConciergeOutcomeAction(conciergeCase.id, outcome);
			if (!res.success) {
				setActionError(res.error);
				return;
			}
			notifySuccess("Case outcome recorded", {
				id: `concierge-outcome-${conciergeCase.id}`,
				description:
					outcome === "hired"
						? "You marked this case as hired."
						: "You marked no candidate as suitable.",
			});
		});
	};

	const handleRequestReplacement = () => {
		setActionError(null);
		startTransition(async () => {
			const res = await requestConciergeReplacementAction(conciergeCase.id);
			if (!res.success) {
				setActionError(res.error);
				return;
			}
			notifySuccess("Replacement requested", {
				id: `concierge-replacement-${conciergeCase.id}`,
				description: "Our team is curating a replacement shortlist.",
			});
		});
	};

	return (
		<Card className="border-primary/20">
			<CardHeader>
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2">
						<Crown className="text-accent size-5" />
						<CardTitle>Concierge Matching Service</CardTitle>
					</div>
					<Badge
						variant={
							state === "shortlist_delivered"
								? "default"
								: state === "closed"
									? "secondary"
									: "outline"
						}
					>
						{state === "intake" && "Awaiting Brief"}
						{state === "in_review" && "Matching In Progress"}
						{state === "shortlist_delivered" && "Shortlist Delivered"}
						{state === "closed" && "Closed"}
						{state === "replacement_requested" && "Replacement Requested"}
					</Badge>
				</div>
				<CardDescription>
					Personalized matching handled by our team for your household requirements.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{state === "intake" && (
					<div className="border-border space-y-3 rounded-lg border p-4">
						<div className="text-heading flex items-center gap-2 text-sm font-medium">
							<FileText className="text-accent size-4" />
							<span>Step 1: Fill Out Your Requirements Brief</span>
						</div>
						<p className="text-muted-foreground text-sm">
							Your Concierge subscription includes staff-assisted shortlisting. Please
							complete your brief so our team can find the best matches.
						</p>
						<Link
							href="/dashboard/mwajiri/concierge"
							className={buttonVariants({ variant: "default", size: "sm" })}
						>
							Complete Brief Now
						</Link>
					</div>
				)}

				{(state === "in_review" || state === "replacement_requested") && (
					<div className="border-border space-y-2 rounded-lg border p-4">
						<div className="text-heading flex items-center gap-2 text-sm font-medium">
							<Clock className="text-accent size-4" />
							<span>Our Staff Are Crafting Your Shortlist</span>
						</div>
						<p className="text-muted-foreground text-sm">
							{state === "replacement_requested"
								? "Your replacement request has been received. Our team is curating a replacement shortlist for you."
								: "Your brief has been submitted. Our team is hand-picking verified wajakazi matching your requirements (usually within 3–5 business days)."}
						</p>
					</div>
				)}

				{state === "shortlist_delivered" && (
					<div className="space-y-4">
						<div className="border-primary/30 bg-primary/5 space-y-1 rounded-lg border p-4">
							<div className="text-primary flex items-center gap-2 text-sm font-medium">
								<CheckCircle2 className="size-4" />
								<span>Your Shortlist is Ready!</span>
							</div>
							<p className="text-muted-foreground text-sm">
								We have hand-picked candidates for you. Contact details for all
								shortlisted workers have been unlocked automatically below.
							</p>
						</div>

						{conciergeCase.shortlist && conciergeCase.shortlist.length > 0 && (
							<div className="space-y-3">
								<h4 className="text-heading text-sm font-semibold">
									Shortlisted Candidates
								</h4>
								<div className="grid gap-3">
									{(conciergeCase.shortlist as ShortlistCandidate[]).map((item, idx) => {
										const candidate =
											typeof item.candidate === "object" ? item.candidate : null;
										if (!candidate) return null;

										return (
											<div
												key={candidate.id ?? idx}
												className="border-border flex flex-col items-start justify-between gap-3 rounded-lg border p-3 sm:flex-row sm:items-center"
											>
												<div className="space-y-1">
													<div className="flex items-center gap-2">
														<UserCheck className="text-primary size-4" />
														<span className="text-foreground font-semibold">
															{candidate.displayName}
														</span>
														{candidate.location && (
															<span className="text-muted-foreground text-xs">
																({candidate.location})
															</span>
														)}
													</div>
													{item.matchNote && (
														<p className="text-muted-foreground text-xs italic">
															&quot;{item.matchNote}&quot;
														</p>
													)}
												</div>
												{candidate.slug && (
													<Link
														href={`/dashboard/mwajiri/browse/${candidate.slug}`}
														className={buttonVariants({ variant: "outline", size: "sm" })}
													>
														View & Contact
													</Link>
												)}
											</div>
										);
									})}
								</div>
							</div>
						)}

						<div className="border-border space-y-2 border-t pt-3">
							<p className="text-muted-foreground text-xs font-medium">
								Record Case Outcome:
							</p>
							<div className="flex flex-wrap gap-2">
								<Button
									size="sm"
									variant="default"
									disabled={isPending}
									onClick={() => handleRecordOutcome("hired")}
								>
									{isPending && <Loader2 className="mr-1 size-3 animate-spin" />}
									Hired from Shortlist
								</Button>
								<Button
									size="sm"
									variant="outline"
									disabled={isPending}
									onClick={() => handleRecordOutcome("none_suitable")}
								>
									{isPending && <Loader2 className="mr-1 size-3 animate-spin" />}
									No Candidate Suitable
								</Button>
							</div>
						</div>
					</div>
				)}

				{state === "closed" && (
					<div className="border-border space-y-3 rounded-lg border p-4">
						<div className="flex items-center justify-between">
							<div className="space-y-1">
								<p className="text-foreground text-sm font-medium">
									Case Closed (
									{conciergeCase.outcome === "hired" ? "Hired" : "None Suitable"})
								</p>
								<p className="text-muted-foreground text-xs">
									Delivered on{" "}
									{conciergeCase.deliveredAt
										? new Date(conciergeCase.deliveredAt).toLocaleDateString("en-GB")
										: "N/A"}
								</p>
							</div>
						</div>

						{conciergeCase.outcome === "hired" &&
							!conciergeCase.replacementUsedAt &&
							eligibleForReplacement && (
								<div className="border-border space-y-2 border-t pt-3">
									<p className="text-muted-foreground text-xs">
										You are eligible for a 1-time replacement guarantee within 30 days of
										your confirmed hire.
									</p>
									<Button
										size="sm"
										variant="outline"
										disabled={isPending}
										onClick={handleRequestReplacement}
									>
										{isPending ? (
											<Loader2 className="mr-1 size-3 animate-spin" />
										) : (
											<RefreshCw className="mr-1 size-3" />
										)}
										Request Replacement
									</Button>
								</div>
							)}

						{conciergeCase.replacementUsedAt && (
							<p className="text-muted-foreground text-xs italic">
								Replacement guarantee was claimed on{" "}
								{new Date(conciergeCase.replacementUsedAt).toLocaleDateString("en-GB")}.
							</p>
						)}
					</div>
				)}

				{actionError && <p className="text-destructive text-xs">{actionError}</p>}
			</CardContent>
		</Card>
	);
};

export { ConciergeStatusCard };
