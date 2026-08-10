import { Lock } from "lucide-react";
import Link from "next/link";

interface PaywallOverlayProps {
	verifiedCount: number;
}

// overlay component to restrict access to worker listings for non-subscribed users
const PaywallOverlay = ({ verifiedCount }: PaywallOverlayProps) => {
	return (
		// backdrop to blur content and block interaction
		<div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-2xl bg-black/60 px-6 text-center backdrop-blur-sm">
			// modal container for call-to-action
			<div className="bg-background/95 flex flex-col items-center gap-4 rounded-2xl p-6 shadow-xl">
				<div className="bg-primary/10 flex size-12 items-center justify-center rounded-full">
					<Lock className="text-primary size-6" />
				</div>
				<div>
					<p className="font-display text-foreground text-base font-bold">
						Subscribe to View Full Profiles
					</p>
					<p className="text-muted-foreground mt-1 text-sm">
						{verifiedCount} verified worker{verifiedCount !== 1 ? "s" : ""} are available.
						Subscribe to unlock their full profiles and get in touch.
					</p>
				</div>
				<Link
					href="/dashboard/mwajiri/subscription"
					className="bg-primary text-primary-foreground hover:bg-primary/90 w-full rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
				>
					View Subscription Plans
				</Link>
				<p className="text-muted-foreground text-xs">
					Already subscribed?{" "}
					<Link
						href="/dashboard/mwajiri/subscription"
						className="text-primary font-medium hover:underline"
					>
						Manage your subscription
					</Link>
				</p>
			</div>
		</div>
	);
};

export { PaywallOverlay };
