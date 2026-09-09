import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { RevenueSnapshot } from "@/services/admin.service";

type RevenueCardProps = {
	snapshot: RevenueSnapshot;
};

// money is integer KSh, so a plain thousands-separated format is enough
const formatKsh = (value: number): string => `KSh ${value.toLocaleString("en-KE")}`;

// the running revenue total, split by verification fees vs subscriptions, with
// the same split for the last 30 days
const RevenueCard = ({ snapshot }: RevenueCardProps) => (
	<Card className="h-full">
		<CardHeader>
			<CardTitle>Revenue</CardTitle>
			<CardDescription>Confirmed payments, split by type.</CardDescription>
		</CardHeader>
		<CardContent className="flex flex-col gap-4">
			<div>
				<p className="text-muted-foreground text-sm">All time</p>
				<p className="text-heading text-3xl font-semibold">
					{formatKsh(snapshot.allTime.total)}
				</p>
				<div className="mt-2 flex flex-col gap-1 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Verification fees</span>
						<span className="font-medium">
							{formatKsh(snapshot.allTime.verification)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Subscriptions</span>
						<span className="font-medium">
							{formatKsh(snapshot.allTime.subscription)}
						</span>
					</div>
				</div>
			</div>

			<div className="border-t pt-4">
				<p className="text-muted-foreground text-sm">Last 30 days</p>
				<p className="text-heading text-2xl font-semibold">
					{formatKsh(snapshot.last30Days.total)}
				</p>
				<div className="mt-2 flex flex-col gap-1 text-sm">
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Verification fees</span>
						<span className="font-medium">
							{formatKsh(snapshot.last30Days.verification)}
						</span>
					</div>
					<div className="flex items-center justify-between">
						<span className="text-muted-foreground">Subscriptions</span>
						<span className="font-medium">
							{formatKsh(snapshot.last30Days.subscription)}
						</span>
					</div>
				</div>
			</div>
		</CardContent>
	</Card>
);

export { RevenueCard };
