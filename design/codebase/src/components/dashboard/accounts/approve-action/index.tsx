"use client";

import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface ApproveActionProps {
	profileId: string;
}

const ApproveAction = ({ profileId }: ApproveActionProps) => {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [done, setDone] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleApprove = async () => {
		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/apis/verification/approve", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ profileId }),
			});

			if (res.ok) {
				setDone(true);
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Approval failed.");
			}
		} catch {
			setError("Network error.");
		} finally {
			setLoading(false);
		}
	};

	if (done) {
		return (
			<div className="flex items-center gap-1.5">
				<CheckCircle2 className="text-accent size-4" />
				<span className="text-accent text-xs font-medium">Approved</span>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-1">
			<Button
				size="sm"
				onClick={handleApprove}
				disabled={loading}
				className="bg-accent text-accent-foreground hover:bg-accent-hover gap-1.5"
			>
				<CheckCircle2 className="size-3.5" />
				{loading ? "Approving..." : "Approve"}
			</Button>
			{error && <p className="text-destructive text-xs">{error}</p>}
		</div>
	);
};

export { ApproveAction };
