// src/components/dashboard/mwajiri/tier-selection-card/index.tsx

"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";

interface Tier {
	tierId: string;
	name: string;
	price: number;
	durationDays: number;
	description?: string | null;
	isActive: boolean;
}

interface TierSelectionCardProps {
	tiers: Tier[];
	// called when the mwajiri confirms a tier — hands off to the payment card
	onTierSelected: (tier: Tier) => void;
}

// formats duration into a human-readable label rather than exposing raw days
const formatDuration = (days: number) => {
	if (days === 14) return "2 Weeks";
	if (days === 28) return "4 Weeks";
	if (days === 46) return "6 Weeks";
	// fallback for any duration the sa defines — always readable
	return `${days} days`;
};

const TierSelectionCard = ({ tiers, onTierSelected }: TierSelectionCardProps) => {
	const [selectedTierId, setSelectedTierId] = useState<string | null>(
		// pre-select the first tier so the mwajiri always has a default choice
		tiers[0]?.tierId ?? null,
	);

	const selectedTier = tiers.find((t) => t.tierId === selectedTierId) ?? null;

	return (
		<div className="bg-card border-border flex flex-col gap-6 rounded-xl border p-6">
			<div>
				<p className="text-foreground font-semibold">Choose a Plan</p>
				<p className="text-muted-foreground text-sm">
					Select the subscription that fits your hiring needs.
				</p>
			</div>

			<div className="flex flex-col gap-3">
				{tiers.map((tier) => {
					const isSelected = tier.tierId === selectedTierId;

					return (
						<button
							key={tier.tierId}
							type="button"
							onClick={() => setSelectedTierId(tier.tierId)}
							className={[
								"flex items-start gap-4 rounded-lg border px-4 py-4 text-left transition-colors",
								isSelected
									? "border-primary bg-primary/5"
									: "border-border bg-muted/30 hover:bg-muted/50",
							].join(" ")}
						>
							{/* selection indicator — filled when active */}
							<div
								className={[
									"mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
									isSelected
										? "border-primary bg-primary"
										: "border-muted-foreground/40 bg-transparent",
								].join(" ")}
							>
								{isSelected && (
									<CheckCircle2 className="text-primary-foreground size-3.5" />
								)}
							</div>

							<div className="flex flex-1 flex-col gap-0.5">
								<div className="flex items-center justify-between gap-2">
									<p className="text-foreground text-sm font-semibold">{tier.name}</p>
									<p className="text-foreground text-sm font-bold">
										KSh {tier.price.toLocaleString()}
										<span className="text-muted-foreground ml-1 text-xs font-normal">
											/ {formatDuration(tier.durationDays).toLowerCase()}
										</span>
									</p>
								</div>
								{tier.description && (
									<p className="text-muted-foreground text-xs">{tier.description}</p>
								)}
							</div>
						</button>
					);
				})}
			</div>

			<Button
				onClick={() => selectedTier && onTierSelected(selectedTier)}
				disabled={!selectedTier}
				className="w-full"
			>
				Continue with {selectedTier?.name ?? "selected plan"}
			</Button>
		</div>
	);
};

export { TierSelectionCard };
export type { Tier };
