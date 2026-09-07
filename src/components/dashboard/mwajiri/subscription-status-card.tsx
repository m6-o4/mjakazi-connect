import { differenceInCalendarDays } from "date-fns";
import { CheckCircle2, Clock, CreditCard, ShieldAlert } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type SubscriptionState =
	"none" | "pending_payment" | "active" | "expired" | "suspended" | "blacklisted";

type SubscriptionStatusCardProps = {
	state: SubscriptionState;
	tierName: string | null;
	tierExpiry: string | null;
};

// datetimes are stored utc and rendered in nairobi per code-standards
const formatExpiry = (iso: string | null): string | null => {
	if (!iso) return null;
	return new Date(iso).toLocaleDateString("en-GB", {
		day: "numeric",
		month: "long",
		year: "numeric",
		timeZone: "Africa/Nairobi",
	});
};

const daysRemaining = (iso: string | null): number => {
	if (!iso) return 0;
	return Math.max(0, differenceInCalendarDays(new Date(iso), new Date()));
};

// the first thing a mwajiri sees: their subscription status, with the CTA that
// follows from it. `none`/`expired` carries the "no subscription" notice and a
// plan CTA; `active` shows the tier + days remaining; pending and restricted
// states are honest without an action
const SubscriptionStatusCard = ({
	state,
	tierName,
	tierExpiry,
}: SubscriptionStatusCardProps) => {
	if (state === "active") {
		const days = daysRemaining(tierExpiry);
		return (
			<Card className="ring-primary/40">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<CheckCircle2 className="text-primary size-5 shrink-0" />
						Your subscription is active
					</CardTitle>
					<CardDescription>
						{tierName ? `${tierName} plan` : "Your plan"} — {days}{" "}
						{days === 1 ? "day" : "days"} remaining
						{formatExpiry(tierExpiry)
							? `. Contact details stay unlocked until ${formatExpiry(tierExpiry)}.`
							: "."}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					<Link
						href="/dashboard/mwajiri/subscription"
						className={buttonVariants({ variant: "outline" })}
					>
						Extend
					</Link>
				</CardContent>
			</Card>
		);
	}

	if (state === "pending_payment") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Clock className="text-accent size-5 shrink-0" />
						Payment in progress
					</CardTitle>
					<CardDescription>
						Confirm the M-Pesa prompt on your phone to activate your subscription.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Link
						href="/dashboard/mwajiri/subscription"
						className={buttonVariants({ variant: "outline" })}
					>
						Go to subscription
					</Link>
				</CardContent>
			</Card>
		);
	}

	if (state === "suspended" || state === "blacklisted") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<ShieldAlert className="text-destructive size-5 shrink-0" />
						Access restricted
					</CardTitle>
					<CardDescription>
						Your account cannot unlock contact details right now. Contact support for
						help.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	const expired = state === "expired";
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<CreditCard className="text-accent size-5 shrink-0" />
					{expired ? "Your subscription has expired" : "You don't have a subscription"}
				</CardTitle>
				<CardDescription>
					Subscribe to unlock the phone number and email of verified wajakazi.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-wrap gap-2">
				<Link
					href="/dashboard/mwajiri/subscription"
					className={buttonVariants({
						className:
							"bg-accent text-accent-foreground hover:bg-accent/90 font-semibold",
					})}
				>
					{expired ? "Renew" : "Choose a plan"}
				</Link>
			</CardContent>
		</Card>
	);
};

export { SubscriptionStatusCard };
