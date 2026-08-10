"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";

interface Tier {
	tierId: string;
	name: string;
	price: number;
	durationDays: number;
	description?: string;
	isActive: boolean;
}

interface SubscriptionTiersFormProps {
	initialTiers: Tier[];
}

// generates a slug-safe id from the tier name — used as the default tierId
// so the sa doesn't have to think about machine ids for common names
const slugify = (value: string) =>
	value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

const emptyTier = (): Tier => ({
	tierId: "",
	name: "",
	price: 0,
	durationDays: 30,
	description: "",
	isActive: true,
});

const SubscriptionTiersForm = ({ initialTiers }: SubscriptionTiersFormProps) => {
	const [tiers, setTiers] = useState<Tier[]>(
		initialTiers.length > 0 ? initialTiers : [emptyTier()],
	);
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const updateTier = (index: number, field: keyof Tier, value: unknown) => {
		setTiers((prev) => {
			const next = [...prev];
			next[index] = { ...next[index], [field]: value };

			// auto-populate tierId from name on first entry so sa only has to
			// type the name — they can override it manually if needed
			if (field === "name" && !prev[index].tierId) {
				next[index].tierId = slugify(value as string);
			}

			return next;
		});

		setStatus("idle");
		setErrorMessage(null);
	};

	const addTier = () => setTiers((prev) => [...prev, emptyTier()]);

	const removeTier = (index: number) =>
		setTiers((prev) => prev.filter((_, i) => i !== index));

	const handleSave = async () => {
		setStatus("saving");
		setErrorMessage(null);

		try {
			const res = await fetch("/apis/sa/subscription-tiers", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tiers }),
			});

			const data = await res.json();

			if (!res.ok) {
				setErrorMessage(data.error ?? "Failed to save. Please try again.");
				setStatus("error");
				return;
			}

			setStatus("saved");
			setTimeout(() => setStatus("idle"), 3000);
		} catch {
			setErrorMessage("A network error occurred. Please try again.");
			setStatus("error");
		}
	};

	return (
		<div className="bg-card border-border flex flex-col gap-6 rounded-xl border p-6">
			<div>
				<p className="text-foreground font-semibold">Subscription Tiers</p>
				<p className="text-muted-foreground text-sm">
					Define the plans available to Waajiri. Changes take effect immediately for new
					subscriptions. Never change a Tier ID after go-live — it is stored on active
					subscription records.
				</p>
			</div>

			<div className="flex flex-col gap-6">
				{tiers.map((tier, index) => (
					<div
						key={index}
						className="border-border flex flex-col gap-4 rounded-lg border p-4"
					>
						<div className="flex items-center justify-between">
							<p className="text-foreground text-sm font-semibold">Tier {index + 1}</p>
							{/* prevent removing the last tier — at least one must exist */}
							{tiers.length > 1 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => removeTier(index)}
									className="text-destructive hover:text-destructive h-7 gap-1.5 px-2 text-xs"
								>
									<Trash2 className="size-3.5" />
									Remove
								</Button>
							)}
						</div>

						<div className="grid gap-4 sm:grid-cols-2">
							<div className="flex flex-col gap-2">
								<Label>Display Name</Label>
								<Input
									value={tier.name}
									onChange={(e) => updateTier(index, "name", e.target.value)}
									placeholder="e.g. Basic"
								/>
							</div>

							<div className="flex flex-col gap-2">
								<Label>Tier ID</Label>
								<Input
									value={tier.tierId}
									onChange={(e) => updateTier(index, "tierId", slugify(e.target.value))}
									placeholder="e.g. basic"
								/>
								<p className="text-muted-foreground text-xs">
									Machine-readable. Do not change after go-live.
								</p>
							</div>

							<div className="flex flex-col gap-2">
								<Label>Price (KSh)</Label>
								<div className="flex items-center gap-2">
									<span className="text-muted-foreground text-sm font-medium">KSh</span>
									<Input
										type="number"
										min={1}
										value={tier.price}
										onChange={(e) => updateTier(index, "price", Number(e.target.value))}
										className="max-w-36"
									/>
								</div>
							</div>

							<div className="flex flex-col gap-2">
								<Label>Duration (Days)</Label>
								<Input
									type="number"
									min={1}
									value={tier.durationDays}
									onChange={(e) =>
										updateTier(index, "durationDays", Number(e.target.value))
									}
									className="max-w-36"
								/>
								<p className="text-muted-foreground text-xs">
									30 = monthly · 90 = quarterly · 365 = annual
								</p>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<Label>Description</Label>
							<Textarea
								value={tier.description ?? ""}
								onChange={(e) => updateTier(index, "description", e.target.value)}
								placeholder="Brief summary of what this tier includes..."
								rows={2}
							/>
						</div>

						<div className="flex items-center gap-2">
							<input
								id={`active-${index}`}
								type="checkbox"
								checked={tier.isActive}
								onChange={(e) => updateTier(index, "isActive", e.target.checked)}
								className="size-4"
							/>
							<Label htmlFor={`active-${index}`} className="cursor-pointer">
								Active — visible to Waajiri
							</Label>
						</div>
					</div>
				))}
			</div>

			<Button variant="outline" size="sm" onClick={addTier} className="w-full gap-2">
				<PlusCircle className="size-4" />
				Add Tier
			</Button>

			{errorMessage && <p className="text-destructive text-sm">{errorMessage}</p>}

			<Button onClick={handleSave} disabled={status === "saving"}>
				{status === "saving" ? "Saving..." : status === "saved" ? "Saved" : "Save Tiers"}
			</Button>
		</div>
	);
};

export { SubscriptionTiersForm };
