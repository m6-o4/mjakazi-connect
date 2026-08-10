import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";

interface CompletenessItem {
	label: string;
	complete: boolean;
	href: string;
}

interface ProfileCompletenessCardProps {
	items: CompletenessItem[];
	profileComplete: boolean;
}

const ProfileCompletenessCard = ({
	items,
	profileComplete,
}: ProfileCompletenessCardProps) => {
	if (profileComplete) return null;

	const completedCount = items.filter((i) => i.complete).length;
	const percentage = Math.round((completedCount / items.length) * 100);

	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-muted-foreground text-sm font-semibold">
						Profile Completeness
					</p>
					<p className="text-muted-foreground mt-0.5 text-xs">
						Complete your profile to appear in the public directory.
					</p>
				</div>
				<span className="font-display text-primary text-xl font-bold">{percentage}%</span>
			</div>

			{/* progress bar */}
			<div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
				<div
					className="bg-primary h-full rounded-full transition-all duration-500"
					style={{ width: `${percentage}%` }}
				/>
			</div>

			{/* checklist */}
			<div className="flex flex-col gap-2">
				{items.map((item) => (
					<Link
						key={item.label}
						href={item.complete ? "#" : item.href}
						className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
							item.complete ? "cursor-default" : "hover:bg-muted cursor-pointer"
						}`}
					>
						{item.complete ? (
							<CheckCircle2 className="text-accent size-4 shrink-0" />
						) : (
							<Circle className="text-muted-foreground size-4 shrink-0" />
						)}
						<span
							className={
								item.complete ? "text-muted-foreground line-through" : "text-foreground"
							}
						>
							{item.label}
						</span>
						{!item.complete && (
							<ArrowRight className="text-muted-foreground ml-auto size-3.5" />
						)}
					</Link>
				))}
			</div>
		</div>
	);
};

export { ProfileCompletenessCard };
