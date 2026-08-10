"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface PlatformSettingsFormProps {
	currentRegistrationFee: number;
}

// super admin form for updating the mjakazi registration fee — calls PATCH /apis/sa/platform-settings
const PlatformSettingsForm = ({ currentRegistrationFee }: PlatformSettingsFormProps) => {
	// fee is kept as a string to avoid fighting the number input's native behaviour (e.g. leading zeros, empty state)
	const [fee, setFee] = useState<string>(String(currentRegistrationFee));
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSave = async () => {
		setErrorMessage(null);
		setStatus("saving");

		const parsed = Number(fee);

		// validate client-side first to avoid a round-trip for obviously bad input
		if (!Number.isFinite(parsed) || parsed < 1) {
			setErrorMessage("Please enter a valid fee amount of at least KSh 1.");
			setStatus("error");
			return;
		}

		try {
			const res = await fetch("/apis/sa/platform-settings", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ registrationFee: parsed }),
			});

			const data = await res.json();

			// surface the server's error message so the admin gets actionable feedback
			if (!res.ok) {
				setErrorMessage(data.error ?? "Failed to save. Please try again.");
				setStatus("error");
				return;
			}

			setStatus("saved");

			// briefly confirm success then return to idle so the button reflects the current state
			setTimeout(() => setStatus("idle"), 3000);
		} catch {
			setErrorMessage("A network error occurred. Please try again.");
			setStatus("error");
		}
	};

	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div>
				<p className="text-foreground font-semibold">Registration Fee</p>
				<p className="text-muted-foreground text-sm">
					The one-time M-Pesa fee charged to a Mjakazi on registration. Changes take
					effect immediately for all new payment attempts.
				</p>
			</div>

			<div className="flex flex-col gap-2">
				<Label htmlFor="registration-fee">Mjakazi Registration Fee (KSh)</Label>
				<div className="flex items-center gap-2">
					<span className="text-muted-foreground text-sm font-medium">KSh</span>
					<Input
						id="registration-fee"
						type="number"
						min={1}
						value={fee}
						onChange={(e) => {
							setFee(e.target.value);
							// clear any prior feedback so the user knows their edit is fresh
							setStatus("idle");
							setErrorMessage(null);
						}}
						disabled={status === "saving"}
						className="max-w-40"
					/>
				</div>
				{errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}
			</div>

			<div>
				{/* disable when unchanged to prevent redundant PATCH requests */}
				<Button
					onClick={handleSave}
					disabled={status === "saving" || fee === String(currentRegistrationFee)}
				>
					{status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save Fee"}
				</Button>
			</div>
		</div>
	);
};

export { PlatformSettingsForm };
