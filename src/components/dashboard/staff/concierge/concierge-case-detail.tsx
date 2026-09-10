"use client";

import { useState, useTransition } from "react";
import { Crown, Loader2, Plus, Send, Trash2, UserCheck } from "lucide-react";

import { claimConciergeCaseAction, deliverConciergeShortlistAction } from "@/app/actions/concierge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ConciergeCase, User, WajakaziProfile } from "@/payload-types";

type CandidateOption = {
	id: string;
	displayName: string;
	jobsSkills?: string[] | null;
	location?: string | null;
	yearsExperience?: number | null;
	salaryMin?: number | null;
	salaryMax?: number | null;
};

type Props = {
	conciergeCase: ConciergeCase;
	availableCandidates: CandidateOption[];
	currentUserId: string;
};

const ConciergeCaseDetail = ({
	conciergeCase,
	availableCandidates,
	currentUserId,
}: Props) => {
	const [isPending, startTransition] = useTransition();
	const [actionError, setActionError] = useState<string | null>(null);

	const mwajiriUser =
		typeof conciergeCase.mwajiri === "object" ? (conciergeCase.mwajiri as User) : null;
	const assignedUser =
		typeof conciergeCase.assignedTo === "object" ? (conciergeCase.assignedTo as User) : null;
	const brief = conciergeCase.brief;

	const mwajiriName = mwajiriUser
		? [mwajiriUser.firstName, mwajiriUser.lastName].filter(Boolean).join(" ") || mwajiriUser.email
		: "Mwajiri";

	// Shortlist state
	const [selectedCandidates, setSelectedCandidates] = useState<
		{ candidateId: string; displayName: string; matchNote: string }[]
	>(() => {
		if (conciergeCase.shortlist && conciergeCase.shortlist.length > 0) {
			return conciergeCase.shortlist.map((item) => {
				const cand = typeof item.candidate === "object" ? (item.candidate as WajakaziProfile) : null;
				return {
					candidateId: cand?.id ?? String(item.candidate),
					displayName: cand?.displayName ?? "Candidate",
					matchNote: item.matchNote ?? "",
				};
			});
		}
		return [];
	});

	const [searchTerm, setSearchTerm] = useState("");

	const filteredCandidates = availableCandidates.filter((c) => {
		if (selectedCandidates.some((s) => s.candidateId === c.id)) return false;
		if (!searchTerm.trim()) return true;
		return (
			c.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			c.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
			c.jobsSkills?.some((j) => j.toLowerCase().includes(searchTerm.toLowerCase()))
		);
	});

	const handleClaim = () => {
		setActionError(null);
		startTransition(async () => {
			const res = await claimConciergeCaseAction(conciergeCase.id);
			if (!res.success) setActionError(res.error);
		});
	};

	const handleAddCandidate = (cand: CandidateOption) => {
		if (selectedCandidates.length >= 5) return;
		setSelectedCandidates([
			...selectedCandidates,
			{ candidateId: cand.id, displayName: cand.displayName, matchNote: "" },
		]);
	};

	const handleRemoveCandidate = (candidateId: string) => {
		setSelectedCandidates(selectedCandidates.filter((s) => s.candidateId !== candidateId));
	};

	const handleMatchNoteChange = (candidateId: string, note: string) => {
		setSelectedCandidates(
			selectedCandidates.map((s) =>
				s.candidateId === candidateId ? { ...s, matchNote: note } : s,
			),
		);
	};

	const handleDeliver = () => {
		if (selectedCandidates.length < 3 || selectedCandidates.length > 5) {
			setActionError("Shortlist must contain between 3 and 5 candidates.");
			return;
		}

		setActionError(null);
		startTransition(async () => {
			const res = await deliverConciergeShortlistAction(
				conciergeCase.id,
				selectedCandidates.map((s) => ({
					candidateId: s.candidateId,
					matchNote: s.matchNote,
				})),
			);
			if (!res.success) setActionError(res.error);
		});
	};

	return (
		<div className="space-y-6">
			{/* Case Overview & Claim Header */}
			<Card>
				<CardHeader>
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<Crown className="size-5 text-accent shrink-0" />
								<CardTitle className="text-xl">Case for {mwajiriName}</CardTitle>
								<Badge variant="outline">{conciergeCase.state}</Badge>
							</div>
							<CardDescription>
								Assigned staff:{" "}
								{assignedUser
									? [assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(" ")
									: "Unassigned"}
							</CardDescription>
						</div>

						{(!assignedUser || assignedUser.id !== currentUserId) && (
							<Button size="sm" disabled={isPending} onClick={handleClaim}>
								{isPending ? (
									<Loader2 className="mr-2 size-4 animate-spin" />
								) : (
									<UserCheck className="mr-2 size-4" />
								)}
								{assignedUser ? "Reassign to Me" : "Claim Case"}
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{brief ? (
						<div className="grid gap-4 md:grid-cols-2 rounded-lg border border-border p-4 bg-muted/30">
							<div>
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Requirements
								</span>
								<p className="text-sm font-medium text-foreground mt-1 capitalize">
									Role: {brief.jobCategory?.replace("_", " ")}
								</p>
								<p className="text-sm text-foreground capitalize">Location: {brief.location}</p>
								<p className="text-sm text-foreground capitalize">
									Work Preference: {brief.workPreference?.replace("_", "-")}
								</p>
								<p className="text-sm text-foreground">
									Salary Range: KSh {brief.salaryMin?.toLocaleString()} - KSh{" "}
									{brief.salaryMax?.toLocaleString()} / mo
								</p>
							</div>

							<div>
								<span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
									Household & Duties
								</span>
								<p className="text-sm text-foreground mt-1">
									<strong>Family:</strong> {brief.familyDetails || "N/A"}
								</p>
								<p className="text-sm text-foreground">
									<strong>Duties:</strong> {brief.duties || "N/A"}
								</p>
								{brief.specialRequirements && (
									<p className="text-sm text-foreground">
										<strong>Special Notes:</strong> {brief.specialRequirements}
									</p>
								)}
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground italic">
							Mwajiri has not submitted their requirements brief yet.
						</p>
					)}
				</CardContent>
			</Card>

			{/* Shortlist Builder */}
			<Card>
				<CardHeader>
					<CardTitle>Curate Shortlist (3 to 5 Verified Candidates)</CardTitle>
					<CardDescription>
						Select candidates matching the brief and add a match note for each worker before delivering the shortlist.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-6">
					{/* Selected Shortlist Items */}
					<div className="space-y-3">
						<div className="flex items-center justify-between">
							<Label className="text-sm font-semibold">
								Selected Candidates ({selectedCandidates.length} / 5)
							</Label>
							<span className="text-xs text-muted-foreground">
								Requires 3 to 5 candidates
							</span>
						</div>

						{selectedCandidates.length === 0 ? (
							<div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
								No candidates selected yet. Search and pick from the available verified wajakazi list below.
							</div>
						) : (
							<div className="space-y-3">
								{selectedCandidates.map((item, index) => (
									<div
										key={item.candidateId}
										className="rounded-lg border border-border p-4 space-y-3"
									>
										<div className="flex items-center justify-between gap-2">
											<div className="flex items-center gap-2">
												<span className="size-6 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
													{index + 1}
												</span>
												<span className="font-semibold text-foreground text-sm">
													{item.displayName}
												</span>
											</div>
											<Button
												size="icon"
												variant="ghost"
												className="size-8 text-destructive"
												onClick={() => handleRemoveCandidate(item.candidateId)}
											>
												<Trash2 className="size-4" />
											</Button>
										</div>

										<div className="space-y-1">
											<Label htmlFor={`note-${item.candidateId}`} className="text-xs text-muted-foreground">
												Match Note for Mwajiri (Explain why this worker fits their brief)
											</Label>
											<Textarea
												id={`note-${item.candidateId}`}
												rows={2}
												placeholder="e.g. Has 5 years experience as a nanny in Nairobi with excellent CPR skills."
												value={item.matchNote}
												onChange={(e) =>
													handleMatchNoteChange(item.candidateId, e.target.value)
												}
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</div>

					{/* Candidate Search & Picker */}
					<div className="space-y-3 border-t border-border pt-4">
						<Label className="text-sm font-semibold">Search Available Verified Wajakazi</Label>
						<Input
							placeholder="Search by name, location, or skill..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
						/>

						<div className="max-h-60 overflow-y-auto space-y-2 pr-1">
							{filteredCandidates.length === 0 ? (
								<p className="text-xs text-muted-foreground py-2">
									No matching available verified wajakazi found.
								</p>
							) : (
								filteredCandidates.map((cand) => (
									<div
										key={cand.id}
										className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/30"
									>
										<div className="space-y-0.5">
											<span className="text-sm font-medium text-foreground">
												{cand.displayName}
											</span>
											<p className="text-xs text-muted-foreground">
												{cand.location} &bull; {cand.yearsExperience ?? 0} yrs exp &bull; KSh{" "}
												{cand.salaryMin?.toLocaleString()} - {cand.salaryMax?.toLocaleString()}
											</p>
										</div>
										<Button
											size="sm"
											variant="outline"
											disabled={selectedCandidates.length >= 5}
											onClick={() => handleAddCandidate(cand)}
										>
											<Plus className="mr-1 size-3" />
											Add
										</Button>
									</div>
								))
							)}
						</div>
					</div>

					{actionError && <p className="text-sm text-destructive">{actionError}</p>}

					<div className="border-t border-border pt-4 flex justify-end">
						<Button
							disabled={isPending || selectedCandidates.length < 3 || selectedCandidates.length > 5}
							onClick={handleDeliver}
						>
							{isPending ? (
								<>
									<Loader2 className="mr-2 size-4 animate-spin" />
									Delivering Shortlist...
								</>
							) : (
								<>
									<Send className="mr-2 size-4" />
									Deliver Shortlist to Mwajiri
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export { ConciergeCaseDetail };
