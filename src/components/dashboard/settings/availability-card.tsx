"use client";

import { Briefcase, CheckCircle2, Coffee, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState, type ReactNode } from "react";

import { confirmHireByMjakaziAction } from "@/app/actions/hire";
import { updateAvailabilityAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type AvailabilityStatus = "available" | "hired" | "on_break";

type HireCandidate = {
	mwajiriId: string;
	name: string;
	location: string | null;
};

type AvailabilityCardProps = {
	currentStatus: AvailabilityStatus;
	hireCandidates?: HireCandidate[];
};

const STATUS_CONFIG: Record<
	AvailabilityStatus,
	{ label: string; description: string; icon: ReactNode; iconClass: string }
> = {
	available: {
		label: "Available",
		description:
			"You are visible in the directory and can receive expressions of interest.",
		icon: <CheckCircle2 className="size-4" />,
		iconClass: "text-success",
	},
	hired: {
		label: "Hired",
		description: "You have accepted a position. You are hidden from the directory.",
		icon: <Briefcase className="size-4" />,
		iconClass: "text-muted-foreground",
	},
	on_break: {
		label: "On a Break",
		description: "You are temporarily unavailable. You are hidden from the directory.",
		icon: <Coffee className="size-4" />,
		iconClass: "text-muted-foreground",
	},
};

// lets a mjakazi control whether they appear in the public directory/archive.
// choosing Hired asks who hired them (offering the waajiri who unlocked their
// contact or sent interest), so a hire can be recorded from this side too
const AvailabilityCard = ({
	currentStatus,
	hireCandidates = [],
}: AvailabilityCardProps) => {
	const router = useRouter();
	const [status, setStatus] = useState<AvailabilityStatus>(currentStatus);
	const [pickingHire, setPickingHire] = useState(false);
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const change = async (next: AvailabilityStatus) => {
		if (next === status || busy) return;

		// moving to hired asks who hired them when there are candidates to offer
		if (next === "hired" && hireCandidates.length > 0 && !pickingHire) {
			setError(null);
			setPickingHire(true);
			return;
		}

		await applyAvailability(next);
	};

	const applyAvailability = async (next: AvailabilityStatus) => {
		setBusy("availability");
		setError(null);
		try {
			const result = await updateAvailabilityAction(next);
			if (!result.success) {
				setError(result.error ?? "Could not update your availability.");
				return;
			}
			setStatus(next);
			setPickingHire(false);
			router.refresh();
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setBusy(null);
		}
	};

	const pickMwajiri = async (candidate: HireCandidate) => {
		setBusy(`pick-${candidate.mwajiriId}`);
		setError(null);
		try {
			const result = await confirmHireByMjakaziAction({ mwajiriId: candidate.mwajiriId });
			if (!result.success) {
				setError(result.error ?? "Could not confirm the hire.");
				return;
			}
			posthog.capture("hire_confirmed", { confirmedBy: "mjakazi" });
			setStatus("hired");
			setPickingHire(false);
			router.refresh();
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setBusy(null);
		}
	};

	const config = STATUS_CONFIG[status];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Availability</CardTitle>
				<CardDescription>
					Controls whether you appear in the directory and archive.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="border-border bg-muted/40 flex items-center gap-2 rounded-lg border px-4 py-3">
					<span className={config.iconClass}>{config.icon}</span>
					<div>
						<p className="text-foreground text-sm font-semibold">{config.label}</p>
						<p className="text-muted-foreground text-xs">{config.description}</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					{(Object.keys(STATUS_CONFIG) as AvailabilityStatus[]).map((option) => (
						<Button
							key={option}
							type="button"
							variant={option === status ? "default" : "outline"}
							size="sm"
							onClick={() => change(option)}
							disabled={Boolean(busy) || option === status}
						>
							{STATUS_CONFIG[option].label}
						</Button>
					))}
				</div>

				{pickingHire ? (
					<div className="border-border flex flex-col gap-2 rounded-lg border p-3">
						<p className="text-sm font-medium">Who hired you?</p>
						<div className="flex flex-col gap-2">
							{hireCandidates.map((candidate) => (
								<button
									key={candidate.mwajiriId}
									type="button"
									onClick={() => pickMwajiri(candidate)}
									disabled={Boolean(busy)}
									className="border-border hover:bg-muted/50 flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60"
								>
									<span className="flex flex-col">
										<span className="text-sm font-medium">{candidate.name}</span>
										{candidate.location ? (
											<span className="text-muted-foreground flex items-center gap-1 text-xs">
												<MapPin className="size-3" />
												{candidate.location}
											</span>
										) : null}
									</span>
									{busy === `pick-${candidate.mwajiriId}` ? (
										<span className="text-muted-foreground text-xs">Confirming…</span>
									) : null}
								</button>
							))}
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => applyAvailability("hired")}
								disabled={Boolean(busy)}
							>
								Not listed — hired elsewhere
							</Button>
						</div>
					</div>
				) : null}

				{error ? <p className="text-destructive text-xs">{error}</p> : null}
			</CardContent>
		</Card>
	);
};

export { AvailabilityCard };
