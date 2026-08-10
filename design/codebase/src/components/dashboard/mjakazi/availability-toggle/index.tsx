"use client";

import { useState } from "react";
import { Briefcase, Coffee, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

type AvailabilityStatus = "available" | "hired" | "on_break";

interface AvailabilityToggleProps {
	currentStatus: AvailabilityStatus;
}

// define ui configuration for status states
const statusConfig: Record<
	AvailabilityStatus,
	{ label: string; description: string; className: string; icon: React.ReactNode }
> = {
	available: {
		label: "Available",
		description:
			"You are visible in the directory and can receive expressions of interest.",
		className: "bg-accent/10 border-accent/30 text-accent",
		icon: <CheckCircle2 className="size-4" />,
	},
	hired: {
		label: "Hired",
		description: "You have accepted a position. You are hidden from the directory.",
		className: "bg-muted border-border text-muted-foreground",
		icon: <Briefcase className="size-4" />,
	},
	on_break: {
		label: "On a Break",
		description: "You are temporarily unavailable. You are hidden from the directory.",
		className: "bg-muted border-border text-muted-foreground",
		icon: <Coffee className="size-4" />,
	},
};

// component for managing worker availability
const AvailabilityToggle = ({ currentStatus }: AvailabilityToggleProps) => {
	const router = useRouter();
	const [status, setStatus] = useState<AvailabilityStatus>(currentStatus);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	// update worker status via api
	const handleChange = async (newStatus: AvailabilityStatus) => {
		if (newStatus === status || loading) return;

		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/apis/profile/update-availability", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ availabilityStatus: newStatus }),
			});

			if (res.ok) {
				setStatus(newStatus);
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Failed to update availability.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	const config = statusConfig[status];

	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div>
				<p className="text-foreground text-sm font-semibold">Availability Status</p>
				<p className="text-muted-foreground mt-0.5 text-xs">
					Controls whether you appear in the Mwajiri browse directory.
				</p>
			</div>

			{/* render current status indicator */}
			<div
				className={`flex items-center gap-2 rounded-lg border px-4 py-3 ${config.className}`}
			>
				{config.icon}
				<div>
					<p className="text-sm font-semibold">{config.label}</p>
					<p className="text-xs opacity-80">{config.description}</p>
				</div>
			</div>

			{/* render status selection buttons */}
			<div className="flex flex-wrap gap-2">
				{(["available", "hired", "on_break"] as AvailabilityStatus[]).map((s) => (
					<button
						key={s}
						onClick={() => handleChange(s)}
						disabled={loading || s === status}
						className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ${
							s === status
								? "bg-primary border-primary text-primary-foreground"
								: "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
						}`}
					>
						{statusConfig[s].label}
					</button>
				))}
			</div>

			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
};

export { AvailabilityToggle };
