import { Lock, Mail, Phone, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type BrowseContactCardProps = {
	isActive: boolean;
};

// a masked contact row. renders a placeholder, never the real value — the actual
// phone/email are not even selected on this page, so there is nothing to leak.
// the 6.4 reveal swaps this whole card for live data
const MaskedRow = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
	<div className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
		<span className="text-muted-foreground flex items-center gap-2 text-sm">
			<Icon className="size-4 shrink-0" />
			{label}
		</span>
		<span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
			<Lock className="size-3.5" />
			••••••••
		</span>
	</div>
);

// the contact area a signed-in mwajiri sees on a browse detail page. an active
// subscriber gets an unlock button (inert until 6.4 wires the reveal); everyone
// else is pointed at the subscription page. the rows are placeholders, never
// real contact data — masking here is UX, the enforcement is the guarded read
// that never selected the fields in the first place
const BrowseContactCard = ({ isActive }: BrowseContactCardProps) => (
	<Card className="mt-2">
		<CardContent className="flex flex-col gap-4 py-6">
			<h2 className="text-heading text-lg font-semibold">Contact details</h2>

			<div className="flex flex-col gap-2">
				<MaskedRow icon={Phone} label="Phone number" />
				<MaskedRow icon={Mail} label="Email address" />
			</div>

			{isActive ? (
				<div className="flex flex-col gap-2">
					<Button disabled>Unlock contact details</Button>
					<p className="text-muted-foreground text-xs">
						Unlocking is available soon. Your subscription is active.
					</p>
				</div>
			) : (
				<div className="flex flex-col gap-2">
					<Link
						href="/dashboard/mwajiri/subscription"
						className={buttonVariants({
							className:
								"bg-accent text-accent-foreground hover:bg-accent/90 font-semibold",
						})}
					>
						Subscribe to unlock
					</Link>
					<p className="text-muted-foreground text-xs">
						Phone and email are shared with subscribed waajiri only.
					</p>
				</div>
			)}
		</CardContent>
	</Card>
);

export { BrowseContactCard };
