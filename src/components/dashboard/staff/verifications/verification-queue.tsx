import { Clock, Inbox } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";

type QueueItem = {
	id: string;
	displayName: string;
	legalName: string | null;
	submittedAt: string | null;
	attempts: number | null;
};

type VerificationQueueProps = {
	items: QueueItem[];
};

const formatDate = (value: string): string =>
	new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "Africa/Nairobi",
	}).format(new Date(value));

// the pending_review list. each row links to its review case; no state changes
// happen here — the list is purely navigational
const VerificationQueue = ({ items }: VerificationQueueProps) => {
	if (items.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
				<Inbox className="text-muted-foreground size-6" />
				<p className="text-foreground mt-3 text-base font-semibold">Queue is clear</p>
				<p className="text-muted-foreground mt-1 text-sm">
					No profiles are awaiting review right now.
				</p>
			</div>
		);
	}

	return (
		<div className="bg-card border-border divide-border divide-y rounded-lg border">
			{items.map((item) => {
				const attempts = item.attempts ?? 0;

				return (
					<Link
						key={item.id}
						href={`/dashboard/staff/verifications/${item.id}`}
						className="hover:bg-muted flex items-center justify-between gap-3 p-4 transition-colors"
					>
						<div className="min-w-0">
							<div className="flex flex-wrap items-center gap-2">
								<p className="text-foreground text-sm font-semibold">
									{item.displayName}
								</p>
								{attempts > 0 && (
									<Badge variant="secondary">
										{attempts === 1
											? "1 prior rejection"
											: `${attempts} prior rejections`}
									</Badge>
								)}
							</div>
							<p className="text-muted-foreground truncate text-xs">
								{item.legalName ? `Legal name: ${item.legalName}` : "Legal name not set"}
							</p>
						</div>
						<div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
							<Clock className="size-3.5" />
							{item.submittedAt
								? `Submitted ${formatDate(item.submittedAt)}`
								: "Submitted"}
						</div>
					</Link>
				);
			})}
		</div>
	);
};

export { VerificationQueue };
export type { QueueItem };
