"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Lock, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface LegalNameFormProps {
	currentLegalFirstName: string | null;
	currentLegalLastName: string | null;
	isLocked: boolean;
}

const LegalNameForm = ({
	currentLegalFirstName,
	currentLegalLastName,
	isLocked,
}: LegalNameFormProps) => {
	const router = useRouter();
	const [firstName, setFirstName] = useState(currentLegalFirstName ?? "");
	const [lastName, setLastName] = useState(currentLegalLastName ?? "");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSave = async () => {
		if (!firstName.trim() || !lastName.trim()) {
			setError("Both first and last name are required.");
			return;
		}

		setLoading(true);
		setError(null);
		// clear success state after delay
		setTimeout(() => setSuccess(false), 3000);

		try {
			const res = await fetch("/apis/profile/update-mjakazi", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					legalFirstName: firstName.trim(),
					legalLastName: lastName.trim(),
				}),
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
			<div className="flex items-start justify-between gap-3">
				<div>
					<p className="text-muted-foreground text-sm font-semibold">Legal Name</p>
					<p className="text-muted-foreground text-sm">
						Enter your name exactly as it appears on your ID Card.
					</p>
				</div>
				{isLocked && (
					<div className="bg-muted/40 flex items-center gap-1.5 rounded-lg px-3 py-1.5">
						<Lock className="text-muted-foreground size-3.5" />
						<span className="text-muted-foreground text-xs">Locked</span>
					</div>
				)}
			</div>

			{isLocked && (
				<div className="bg-muted/40 flex items-start gap-3 rounded-lg px-4 py-3">
					<Lock className="text-muted-foreground mt-0.5 size-4 shrink-0" />
					<p className="text-muted-foreground text-xs">
						Your legal name cannot be changed while your verification is under review or
						complete. Contact support if a correction is needed.
					</p>
				</div>
			)}

			{success && (
				<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
					<CheckCircle2 className="text-accent size-4 shrink-0" />
					<p className="text-accent text-sm font-medium">
						Legal name saved successfully.
					</p>
				</div>
			)}

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="legalFirstName" className="text-xs">
						Legal First Name
					</Label>
					<Input
						id="legalFirstName"
						placeholder="As on your National ID"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
						disabled={isLocked}
						className="text-sm"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="legalLastName" className="text-xs">
						Legal Last Name
					</Label>
					<Input
						id="legalLastName"
						placeholder="As on your National ID"
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
						disabled={isLocked}
						className="text-sm"
					/>
				</div>
			</div>

			{!isLocked && (
				<Button onClick={handleSave} disabled={loading} className="w-full gap-2">
					<UserCheck className="size-4" />
					{loading ? "Saving..." : "Save Legal Name"}
				</Button>
			)}

			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
};

export { LegalNameForm };
