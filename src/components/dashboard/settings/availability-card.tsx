"use client";

import { Briefcase, CheckCircle2, Coffee } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import { updateAvailabilityAction } from "@/app/actions/profile";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type AvailabilityStatus = "available" | "hired" | "on_break";

type AvailabilityCardProps = {
	currentStatus: AvailabilityStatus;
};

const STATUS_CONFIG: Record<
	AvailabilityStatus,
	{ label: string; description: string; icon: ReactNode; iconClass: string }
> = {
	available: {
		label: "Available",
		description:
			"You are visible in the directory and can receive expressions of interest.",
		icon: <CheckCircle2 className="size-4" />,
		iconClass: "text-success",
	},
	hired: {
		label: "Hired",
		description: "You have accepted a position. You are hidden from the directory.",
		icon: <Briefcase className="size-4" />,
		iconClass: "text-muted-foreground",
	},
	on_break: {
		label: "On a Break",
		description: "You are temporarily unavailable. You are hidden from the directory.",
		icon: <Coffee className="size-4" />,
		iconClass: "text-muted-foreground",
	},
};

// lets a mjakazi control whether they appear in the public directory/archive
const AvailabilityCard = ({ currentStatus }: AvailabilityCardProps) => {
	const router = useRouter();
	const [status, setStatus] = useState<AvailabilityStatus>(currentStatus);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const change = async (next: AvailabilityStatus) => {
		if (next === status || loading) return;

		setLoading(true);
		setError(null);

		try {
			const result = await updateAvailabilityAction(next);
			if (!result.success) {
				setError(result.error ?? "Could not update your availability.");
				return;
			}
			setStatus(next);
			router.refresh();
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const config = STATUS_CONFIG[status];

	return (
		<Card>
			<CardHeader>
				<CardTitle>Availability</CardTitle>
				<CardDescription>
					Controls whether you appear in the directory and archive.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="border-border bg-muted/40 flex items-center gap-2 rounded-lg border px-4 py-3">
					<span className={config.iconClass}>{config.icon}</span>
					<div>
						<p className="text-foreground text-sm font-semibold">{config.label}</p>
						<p className="text-muted-foreground text-xs">{config.description}</p>
					</div>
				</div>

				<div className="flex flex-wrap gap-2">
					{(Object.keys(STATUS_CONFIG) as AvailabilityStatus[]).map((option) => (
						<Button
							key={option}
							type="button"
							variant={option === status ? "default" : "outline"}
							size="sm"
							onClick={() => change(option)}
							disabled={loading || option === status}
						>
							{STATUS_CONFIG[option].label}
						</Button>
					))}
				</div>

				{error ? <p className="text-destructive text-xs">{error}</p> : null}
			</CardContent>
		</Card>
	);
};

export { AvailabilityCard };
