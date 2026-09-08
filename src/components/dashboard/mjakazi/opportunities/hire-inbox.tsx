"use client";

import { Briefcase } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { confirmHireByMjakaziAction, endHireAction, reverseHireAction } from "@/app/actions/hire";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type HireItem = {
	id: string;
	counterpartyId: string;
	counterpartyName: string;
	state: "pending_agreement" | "agreed";
	awaitingYou: boolean;
};

type HireInboxProps = { hires: HireItem[] };

// the mjakazi's hire confirmations on the opportunities screen. a pending hire
// where the mwajiri confirmed first shows Agree / Not correct; an agreed hire
// can still be reversed. agreeing calls the server action, fires the analytics
// event, and refreshes.
const HireInbox = ({ hires }: HireInboxProps) => {
	const router = useRouter();
	const [busy, setBusy] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const agree = async (hire: HireItem) => {
		setBusy(`agree-${hire.id}`);
		setError(null);
		try {
			const result = await confirmHireByMjakaziAction({ mwajiriId: hire.counterpartyId });
			if (!result.success) {
				setError(result.error ?? "Could not confirm the hire.");
				return;
			}
			posthog.capture("hire_confirmed", { confirmedBy: "mjakazi" });
			router.refresh();
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setBusy(null);
		}
	};

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
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setBusy(null);
		}
	};

	const endContract = async (hire: HireItem) => {
		setBusy(`end-${hire.id}`);
		setError(null);
		try {
			const result = await endHireAction({ hireId: hire.id });
			if (!result.success) {
				setError(result.error ?? "Could not end the contract.");
				return;
			}
			router.refresh();
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setBusy(null);
		}
	};

	if (hires.length === 0) return null;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Briefcase className="text-accent size-5 shrink-0" />
					Hires
				</CardTitle>
				<CardDescription>
					Hire confirmations that need your attention or are on record.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				{error ? <p className="text-destructive text-sm">{error}</p> : null}
				{hires.map((hire) => (
					<div
						key={hire.id}
						className="border-border flex flex-col gap-2 rounded-lg border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="flex items-center gap-2">
							<span className="text-sm font-medium">{hire.counterpartyName}</span>
							{hire.state === "agreed" ? (
								<Badge>Hired</Badge>
							) : hire.awaitingYou ? (
								<Badge variant="secondary">Confirming</Badge>
							) : (
								<Badge variant="outline">Awaiting their agreement</Badge>
							)}
						</div>
						<div className="flex gap-2">
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
							) : (
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() => reverse(hire)}
									disabled={busy === `reverse-${hire.id}`}
								>
									{hire.awaitingYou ? "Not correct" : "Reverse"}
								</Button>
							)}
						</div>
					</div>
				))}
			</CardContent>
		</Card>
	);
};

export { HireInbox };
