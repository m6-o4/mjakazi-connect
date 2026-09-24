"use client";

import { useState } from "react";

import { updateEoiPolicyAction } from "@/app/actions/settings";
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
import { notifySuccess } from "@/lib/notify";
import type { EoiPolicy } from "@/services/settings.service";

type EoiPolicyFormProps = {
	initialPolicy: EoiPolicy;
};

// admin form for the expression-of-interest policy. every field is held as a
// string to avoid fighting the number input's native behaviour; the five are
// validated together and saved in one call
const EoiPolicyForm = ({ initialPolicy }: EoiPolicyFormProps) => {
	const [minBatch, setMinBatch] = useState(String(initialPolicy.minBatch));
	const [maxBatch, setMaxBatch] = useState(String(initialPolicy.maxBatch));
	const [threshold, setThreshold] = useState(
		String(initialPolicy.responseThresholdPercent),
	);
	const [expiryDays, setExpiryDays] = useState(String(initialPolicy.expiryDays));
	const [cooldownDays, setCooldownDays] = useState(
		String(initialPolicy.resendCooldownDays),
	);
	const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
	const [error, setError] = useState<string | null>(null);

	const policy: EoiPolicy = {
		minBatch: Number(minBatch),
		maxBatch: Number(maxBatch),
		responseThresholdPercent: Number(threshold),
		expiryDays: Number(expiryDays),
		resendCooldownDays: Number(cooldownDays),
	};

	const isWhole = (value: number, min: number, max?: number): boolean =>
		Number.isInteger(value) && value >= min && (max === undefined || value <= max);

	const validate = (): string | null => {
		if (!isWhole(policy.minBatch, 1) || !isWhole(policy.maxBatch, 1)) {
			return "Batch sizes must be whole numbers, at least 1.";
		}
		if (policy.minBatch > policy.maxBatch) {
			return "The minimum batch cannot be larger than the maximum.";
		}
		if (!isWhole(policy.responseThresholdPercent, 1, 100)) {
			return "The response threshold must be between 1 and 100.";
		}
		if (!isWhole(policy.expiryDays, 1)) {
			return "The interest expiry must be at least 1 day.";
		}
		if (!isWhole(policy.resendCooldownDays, 0)) {
			return "The re-send cooldown must be 0 days or more.";
		}
		return null;
	};

	const unchanged =
		policy.minBatch === initialPolicy.minBatch &&
		policy.maxBatch === initialPolicy.maxBatch &&
		policy.responseThresholdPercent === initialPolicy.responseThresholdPercent &&
		policy.expiryDays === initialPolicy.expiryDays &&
		policy.resendCooldownDays === initialPolicy.resendCooldownDays;

	const save = async () => {
		setError(null);

		const invalid = validate();
		if (invalid) {
			setError(invalid);
			setStatus("error");
			return;
		}

		setStatus("saving");
		const result = await updateEoiPolicyAction(policy);
		if (!result.success) {
			setError(result.error ?? "Could not save the interest policy.");
			setStatus("error");
			return;
		}

		setStatus("idle");
		notifySuccess("Interest policy saved", {
			id: "eoi-policy",
			description: "New expression-of-interest batches follow the updated limits.",
		});
	};

	const clearError = () => {
		if (status !== "saving") {
			setStatus("idle");
			setError(null);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Expression of interest policy</CardTitle>
				<CardDescription>
					How many wajakazi a mwajiri may approach at once, how long before an unanswered
					request expires, and how often they may send again.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-5">
				<div className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="eoi-min-batch">Minimum batch size</Label>
						<Input
							id="eoi-min-batch"
							type="number"
							min={1}
							step={1}
							value={minBatch}
							onChange={(event) => {
								setMinBatch(event.target.value);
								clearError();
							}}
							disabled={status === "saving"}
							className="max-w-40"
						/>
						<p className="text-muted-foreground text-xs">Fewest wajakazi in one batch.</p>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="eoi-max-batch">Maximum batch size</Label>
						<Input
							id="eoi-max-batch"
							type="number"
							min={1}
							step={1}
							value={maxBatch}
							onChange={(event) => {
								setMaxBatch(event.target.value);
								clearError();
							}}
							disabled={status === "saving"}
							className="max-w-40"
						/>
						<p className="text-muted-foreground text-xs">Most wajakazi in one batch.</p>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="eoi-threshold">Response threshold (%)</Label>
						<Input
							id="eoi-threshold"
							type="number"
							min={1}
							max={100}
							step={1}
							value={threshold}
							onChange={(event) => {
								setThreshold(event.target.value);
								clearError();
							}}
							disabled={status === "saving"}
							className="max-w-40"
						/>
						<p className="text-muted-foreground text-xs">
							Share of the open batches that must be resolved before a new batch may be
							sent.
						</p>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="eoi-expiry">Interest expiry (days)</Label>
						<Input
							id="eoi-expiry"
							type="number"
							min={1}
							step={1}
							value={expiryDays}
							onChange={(event) => {
								setExpiryDays(event.target.value);
								clearError();
							}}
							disabled={status === "saving"}
							className="max-w-40"
						/>
						<p className="text-muted-foreground text-xs">
							Days before an unanswered request expires and counts as resolved.
						</p>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="eoi-cooldown">Re-send cooldown (days)</Label>
						<Input
							id="eoi-cooldown"
							type="number"
							min={0}
							step={1}
							value={cooldownDays}
							onChange={(event) => {
								setCooldownDays(event.target.value);
								clearError();
							}}
							disabled={status === "saving"}
							className="max-w-40"
						/>
						<p className="text-muted-foreground text-xs">
							Wait before approaching the same mjakazi again after a rejection or expiry.
						</p>
					</div>
				</div>

				{error && <p className="text-destructive text-sm">{error}</p>}

				<Button
					onClick={save}
					disabled={status === "saving" || unchanged}
					className="w-full sm:w-auto"
				>
					{status === "saving" ? "Saving..." : "Save policy"}
				</Button>
			</CardContent>
		</Card>
	);
};

export { EoiPolicyForm };
