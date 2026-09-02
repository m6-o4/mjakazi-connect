import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type CompletenessItem = {
	label: string;
	complete: boolean;
	href: string;
};

type ProfileCompletenessCardProps = {
	items: CompletenessItem[];
};

// progress + checklist of the required profile fields. every incomplete item
// links straight to the profile form so a worker can close the gap in one tap
const ProfileCompletenessCard = ({ items }: ProfileCompletenessCardProps) => {
	const completedCount = items.filter((item) => item.complete).length;
	const percentage =
		items.length === 0 ? 0 : Math.round((completedCount / items.length) * 100);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-start justify-between gap-3">
					<div className="flex flex-col gap-1">
						<CardTitle>Complete your profile</CardTitle>
						<CardDescription>
							Fill in everything below to appear in the directory.
						</CardDescription>
					</div>
					<span className="text-heading text-xl font-semibold">{percentage}%</span>
				</div>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
					<div
						className="bg-primary h-full rounded-full transition-all duration-500"
						style={{ width: `${percentage}%` }}
					/>
				</div>
				<ul className="flex flex-col gap-1">
					{items.map((item) => (
						<li key={item.label}>
							<Link
								href={item.complete ? "#" : item.href}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
									item.complete ? "cursor-default" : "hover:bg-muted",
								)}
							>
								{item.complete ? (
									<CheckCircle2 className="text-accent size-4 shrink-0" />
								) : (
									<Circle className="text-muted-foreground size-4 shrink-0" />
								)}
								<span
									className={cn(
										item.complete
											? "text-muted-foreground line-through"
											: "text-foreground",
									)}
								>
									{item.label}
								</span>
								{!item.complete && (
									<ArrowRight className="text-muted-foreground ml-auto size-3.5" />
								)}
							</Link>
						</li>
					))}
				</ul>
			</CardContent>
		</Card>
	);
};

export { ProfileCompletenessCard };
