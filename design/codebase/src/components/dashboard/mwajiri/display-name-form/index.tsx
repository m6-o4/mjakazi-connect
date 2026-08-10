"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface DisplayNameFormProps {
	currentDisplayName: string;
}

const DisplayNameForm = ({ currentDisplayName }: DisplayNameFormProps) => {
	const router = useRouter();
	const [displayName, setDisplayName] = useState(
		currentDisplayName === "New Employer" ? "" : currentDisplayName,
	);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSave = async () => {
		if (!displayName.trim()) {
			setError("Display name is required.");
			return;
		}

		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const res = await fetch("/apis/profile/update-mwajiri", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ displayName: displayName.trim() }),
			});

			if (res.ok) {
				setSuccess(true);
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Failed to save. Please try again.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div>
				<p className="text-muted-foreground text-sm font-semibold">Your Name</p>
				<p className="text-muted-foreground text-sm">
					This is the name shown to Wajakazi and on your account.
				</p>
			</div>

			{success && (
				<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
					<CheckCircle2 className="text-accent size-5 shrink-0" />
					<p className="text-accent text-sm font-medium">Name saved successfully.</p>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<Label htmlFor="displayName" className="text-xs">
					Full Name
				</Label>
				<Input
					id="displayName"
					placeholder="Your full name"
					value={displayName}
					onChange={(e) => setDisplayName(e.target.value)}
					className="text-sm"
				/>
			</div>

			<Button onClick={handleSave} disabled={loading} className="w-full gap-2">
				<UserCheck className="size-4" />
				{loading ? "Saving..." : "Save Name"}
			</Button>

			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
};

export { DisplayNameForm };
