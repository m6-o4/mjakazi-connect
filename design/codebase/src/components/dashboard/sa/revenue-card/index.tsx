import { TrendingUp } from "lucide-react";

interface RevenueCardProps {
	lifetimeRegistrations: number;
	lifetimeSubscriptions: number;
	monthRegistrations: number;
	monthSubscriptions: number;
}

const formatKsh = (amount: number) => `KSh ${amount.toLocaleString("en-KE")}`;

const RevenueCard = ({
	lifetimeRegistrations,
	lifetimeSubscriptions,
	monthRegistrations,
	monthSubscriptions,
}: RevenueCardProps) => {
	const lifetimeTotal = lifetimeRegistrations + lifetimeSubscriptions;
	const monthTotal = monthRegistrations + monthSubscriptions;

	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div className="flex items-center gap-2">
				<TrendingUp className="text-muted-foreground size-4" />
				<p className="text-muted-foreground text-sm font-semibold">Platform Revenue</p>
			</div>

			{/* display lifetime revenue */}
			<div>
				<p className="font-display text-foreground text-3xl font-bold">
					{formatKsh(lifetimeTotal)}
				</p>
				<p className="text-muted-foreground mt-0.5 text-xs">
					Total confirmed revenue since launch
				</p>
			</div>

			{/* show revenue breakdown */}
			<div className="border-border flex flex-col gap-1.5 border-t pt-3">
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Registrations</span>
					<span className="text-foreground font-medium">
						{formatKsh(lifetimeRegistrations)}
					</span>
				</div>
				<div className="flex items-center justify-between text-xs">
					<span className="text-muted-foreground">Subscriptions</span>
					<span className="text-foreground font-medium">
						{formatKsh(lifetimeSubscriptions)}
					</span>
				</div>
			</div>

			{/* display current month performance */}
			<div className="bg-muted/40 border-border rounded-lg border px-4 py-3">
				<p className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
					This Month
				</p>
				<p className="text-foreground mt-1 text-base font-bold">
					{formatKsh(monthTotal)}
				</p>
				<div className="text-muted-foreground mt-1 flex gap-3 text-xs">
					<span>Registrations: {formatKsh(monthRegistrations)}</span>
					<span>Subscriptions: {formatKsh(monthSubscriptions)}</span>
				</div>
			</div>
		</div>
	);
};

export { RevenueCard };
