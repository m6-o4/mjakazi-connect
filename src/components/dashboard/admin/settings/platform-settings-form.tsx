"use client";

import { useState } from "react";

import { updateVerificationFeeAction } from "@/app/actions/settings";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PlatformSettingsFormProps = {
	currentVerificationFee: number;
};

// admin form for the mjakazi verification fee. the fee is kept as a string to
// avoid fighting the number input's native behaviour (leading zeros, empty state)
const PlatformSettingsForm = ({ currentVerificationFee }: PlatformSettingsFormProps) => {
	const [fee, setFee] = useState<string>(String(currentVerificationFee));
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [error, setError] = useState<string | null>(null);

	const save = async () => {
		setError(null);
		setStatus("saving");

		const parsed = Number(fee);
		if (!Number.isInteger(parsed) || parsed < 1) {
			setError("Enter a whole number of KSh, at least KSh 1.");
			setStatus("error");
			return;
		}

		const result = await updateVerificationFeeAction(parsed);
		if (!result.success) {
			setError(result.error ?? "Could not save the fee.");
			setStatus("error");
			return;
		}

		setStatus("saved");
		setTimeout(() => setStatus("idle"), 3000);
	};

	const disabled = status === "saving" || fee === String(currentVerificationFee);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Verification fee</CardTitle>
				<CardDescription>
					The one-time M-Pesa fee a mjakazi pays for document review. Changes apply to new
					payment attempts immediately.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="verification-fee">Mjakazi verification fee (KSh)</Label>
					<div className="flex items-center gap-2">
						<span className="text-muted-foreground text-sm font-medium">KSh</span>
						<Input
							id="verification-fee"
							type="number"
							min={1}
							step={1}
							value={fee}
							onChange={(event) => {
								setFee(event.target.value);
								setStatus("idle");
								setError(null);
							}}
							disabled={status === "saving"}
							className="max-w-40"
						/>
					</div>
				</div>

				{error && <p className="text-destructive text-sm">{error}</p>}

				<Button onClick={save} disabled={disabled} className="w-full sm:w-auto">
					{status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save fee"}
				</Button>
			</CardContent>
		</Card>
	);
};

export { PlatformSettingsForm };
