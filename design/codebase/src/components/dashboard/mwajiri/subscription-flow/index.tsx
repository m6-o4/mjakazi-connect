"use client";

import { SubscriptionPaymentCard } from "@/components/dashboard/mwajiri/subscription-payment-card";
import { TierSelectionCard } from "@/components/dashboard/mwajiri/tier-selection-card";
import type { Tier } from "@/components/dashboard/mwajiri/tier-selection-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

interface SubscriptionFlowProps {
	tiers: Tier[];
	subscriptionStatus: string;
	subscriptionEndDate: string | null;
	subscriptionTierName: string | null;
}

const SubscriptionFlow = ({
	tiers,
	subscriptionStatus,
	subscriptionEndDate,
	subscriptionTierName,
}: SubscriptionFlowProps) => {
	// selected tier is held here so both the selection and payment cards can access it
	const [selectedTier, setSelectedTier] = useState<Tier | null>(null);

	// active subscription display — shown when the mwajiri has a live subscription
	if (subscriptionStatus === "active") {
		return (
			<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
				<div>
					<p className="text-foreground font-semibold">Your Subscription</p>
					<p className="text-muted-foreground text-sm">
						Current plan and access details.
					</p>
				</div>

				<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
					<CheckCircle2 className="text-accent size-5 shrink-0" />
					<div className="flex-1">
						<div className="flex items-center gap-2">
							<p className="text-accent text-sm font-semibold">
								{subscriptionTierName ?? "Active Plan"}
							</p>
							<Badge variant="outline" className="text-xs">
								Active
							</Badge>
						</div>
						{subscriptionEndDate && (
							<p className="text-muted-foreground mt-0.5 text-xs">
								Renews or expires on{" "}
								{new Date(subscriptionEndDate).toLocaleDateString("en-KE", {
									day: "2-digit",
									month: "long",
									year: "numeric",
								})}
							</p>
						)}
					</div>
				</div>

				{/* browse wajakazi is the primary post-subscription action */}
				<Button asChild className="w-full">
					<Link href="/dashboard/mwajiri/browse">Browse Wajakazi</Link>
				</Button>
			</div>
		);
	}

	// expired display — subscription lapsed, prompt renewal
	if (subscriptionStatus === "expired") {
		return (
			<div className="flex flex-col gap-6">
				<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
					<div className="bg-muted/40 flex items-center gap-3 rounded-lg px-4 py-3">
						<Clock className="text-muted-foreground size-5 shrink-0" />
						<div>
							<p className="text-foreground text-sm font-semibold">
								Subscription Expired
							</p>
							<p className="text-muted-foreground text-xs">
								Your access has lapsed. Renew below to continue browsing Wajakazi.
							</p>
						</div>
					</div>
				</div>

				{/* reuse the same tier selection and payment flow for renewal */}
				{selectedTier ? (
					<SubscriptionPaymentCard
						tier={selectedTier}
						onBack={() => setSelectedTier(null)}
					/>
				) : (
					<TierSelectionCard tiers={tiers} onTierSelected={setSelectedTier} />
				)}
			</div>
		);
	}

	// payment card — shown after the mwajiri has selected a tier
	if (selectedTier) {
		return (
			<SubscriptionPaymentCard tier={selectedTier} onBack={() => setSelectedTier(null)} />
		);
	}

	// default — tier selection is the entry point for new subscribers
	return <TierSelectionCard tiers={tiers} onTierSelected={setSelectedTier} />;
};

export { SubscriptionFlow };
