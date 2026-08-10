import { Users } from "lucide-react";
import Link from "next/link";

interface AccountsLandingProps {
	viewerRole: "admin" | "sa";
	wajakaziCount: number;
	waajiriCount: number;
}

const AccountsLanding = ({
	viewerRole,
	wajakaziCount,
	waajiriCount,
}: AccountsLandingProps) => {
	// base path varies by role so each role stays within its own dashboard subtree
	const base = `/dashboard/${viewerRole}/accounts`;

	return (
		// two-column grid gives each account type equal visual weight at wider viewports
		<div className="grid gap-6 md:grid-cols-2">
			{/* wajakazi card — links to the domestic workers list */}
			<Link
				href={`${base}/wajakazi`}
				className="bg-card border-border hover:border-primary/30 flex flex-col gap-4 rounded-xl border p-6 transition-colors"
			>
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
						<Users className="text-primary size-5" />
					</div>
					<div>
						<p className="text-foreground text-sm font-semibold">Wajakazi</p>
						<p className="text-muted-foreground text-xs">Domestic workers</p>
					</div>
				</div>
				{/* display the live count prominently so admins get an at-a-glance total */}
				<p className="font-display text-foreground text-3xl font-bold">{wajakaziCount}</p>
				<p className="text-primary text-xs font-medium">View all Wajakazi →</p>
			</Link>

			{/* waajiri card — links to the employers list */}
			<Link
				href={`${base}/waajiri`}
				className="bg-card border-border hover:border-primary/30 flex flex-col gap-4 rounded-xl border p-6 transition-colors"
			>
				<div className="flex items-center gap-3">
					<div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
						<Users className="text-primary size-5" />
					</div>
					<div>
						<p className="text-foreground text-sm font-semibold">Waajiri</p>
						<p className="text-muted-foreground text-xs">Employers</p>
					</div>
				</div>
				{/* same pattern as wajakazi — live count as the primary metric */}
				<p className="font-display text-foreground text-3xl font-bold">{waajiriCount}</p>
				<p className="text-primary text-xs font-medium">View all Waajiri →</p>
			</Link>
		</div>
	);
};

export { AccountsLanding };
