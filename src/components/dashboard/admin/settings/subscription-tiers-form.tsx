"use client";

import { PlusCircle, Trash2 } from "lucide-react";
import { useState } from "react";

import { updateSubscriptionTiersAction } from "@/app/actions/settings";
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
import { Textarea } from "@/components/ui/textarea";

type Tier = {
	tierId: string;
	name: string;
	price: number;
	durationDays: number;
	description: string;
	isActive: boolean;
	isConcierge: boolean;
};

type SubscriptionTiersFormProps = {
	initialTiers: Tier[];
};

// generates a slug-safe id from the tier name — used as the default tierId so
// the admin does not have to think about machine ids for common names
const slugify = (value: string): string =>
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
	isConcierge: false,
});

// admin editor for the mwajiri subscription tiers. saves by replacing the whole
// array — the client sends the full list and the service validates required
// fields and unique tierIds before persisting
const SubscriptionTiersForm = ({ initialTiers }: SubscriptionTiersFormProps) => {
	const [tiers, setTiers] = useState<Tier[]>(
		initialTiers.length > 0 ? initialTiers : [emptyTier()],
	);
	const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
	const [error, setError] = useState<string | null>(null);

	const updateTier = (index: number, field: keyof Tier, value: unknown) => {
		setTiers((previous) => {
			const next = [...previous];
			next[index] = { ...next[index], [field]: value };

			// auto-populate tierId from name on first entry so the admin only has to
			// type the name — they can override it manually if needed
			if (field === "name" && !previous[index].tierId) {
				next[index].tierId = slugify(value as string);
			}

			return next;
		});

		setStatus("idle");
		setError(null);
	};

	const addTier = () => setTiers((previous) => [...previous, emptyTier()]);

	const removeTier = (index: number) =>
		setTiers((previous) => previous.filter((_, i) => i !== index));

	const save = async () => {
		setStatus("saving");
		setError(null);

		const result = await updateSubscriptionTiersAction(
			tiers.map((tier) => ({
				tierId: tier.tierId.trim(),
				name: tier.name.trim(),
				price: tier.price,
				durationDays: tier.durationDays,
				description: tier.description.trim() || null,
				isActive: tier.isActive,
				isConcierge: tier.isConcierge,
			})),
		);

		if (!result.success) {
			setError(result.error ?? "Could not save the tiers.");
			setStatus("error");
			return;
		}

		setStatus("saved");
		setTimeout(() => setStatus("idle"), 3000);
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Subscription tiers</CardTitle>
				<CardDescription>
					Define the plans available to mwajiri. Changes apply to new subscriptions
					immediately. Never change a Tier ID after go-live — it is stored on active
					subscription records.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-6">
				<div className="flex flex-col gap-6">
					{tiers.map((tier, index) => (
						<div
							key={index}
							className="border-border flex flex-col gap-4 rounded-lg border p-4"
						>
							<div className="flex items-center justify-between">
								<p className="text-foreground text-sm font-semibold">Tier {index + 1}</p>
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
								<div className="flex flex-col gap-1.5">
									<Label htmlFor={`tier-name-${index}`}>Display name</Label>
									<Input
										id={`tier-name-${index}`}
										value={tier.name}
										onChange={(event) => updateTier(index, "name", event.target.value)}
										placeholder="e.g. Essentials"
									/>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor={`tier-id-${index}`}>Tier ID</Label>
									<Input
										id={`tier-id-${index}`}
										value={tier.tierId}
										onChange={(event) =>
											updateTier(index, "tierId", slugify(event.target.value))
										}
										placeholder="e.g. essentials"
									/>
									<p className="text-muted-foreground text-xs">
										Machine-readable. Do not change after go-live.
									</p>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor={`tier-price-${index}`}>Price (KSh)</Label>
									<div className="flex items-center gap-2">
										<span className="text-muted-foreground text-sm font-medium">KSh</span>
										<Input
											id={`tier-price-${index}`}
											type="number"
											min={1}
											value={tier.price}
											onChange={(event) =>
												updateTier(index, "price", Number(event.target.value))
											}
											className="max-w-36"
										/>
									</div>
								</div>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor={`tier-duration-${index}`}>Duration (days)</Label>
									<Input
										id={`tier-duration-${index}`}
										type="number"
										min={1}
										value={tier.durationDays}
										onChange={(event) =>
											updateTier(index, "durationDays", Number(event.target.value))
										}
										className="max-w-36"
									/>
									<p className="text-muted-foreground text-xs">
										14 = fortnight · 30 = monthly · 90 = quarterly
									</p>
								</div>
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor={`tier-description-${index}`}>Description</Label>
								<Textarea
									id={`tier-description-${index}`}
									value={tier.description}
									onChange={(event) =>
										updateTier(index, "description", event.target.value)
									}
									placeholder="Brief summary of what this tier includes..."
									rows={2}
								/>
							</div>

							<div className="flex flex-col gap-2">
								<div className="flex items-center gap-2">
									<input
										id={`tier-active-${index}`}
										type="checkbox"
										checked={tier.isActive}
										onChange={(event) =>
											updateTier(index, "isActive", event.target.checked)
										}
										className="size-4"
									/>
									<Label htmlFor={`tier-active-${index}`} className="cursor-pointer">
										Active — visible to mwajiri
									</Label>
								</div>
								<div className="flex items-center gap-2">
									<input
										id={`tier-concierge-${index}`}
										type="checkbox"
										checked={tier.isConcierge}
										onChange={(event) =>
											updateTier(index, "isConcierge", event.target.checked)
										}
										className="size-4"
									/>
									<Label htmlFor={`tier-concierge-${index}`} className="cursor-pointer">
										Concierge — staff-assisted matching
									</Label>
								</div>
							</div>
						</div>
					))}
				</div>

				<Button variant="outline" size="sm" onClick={addTier} className="w-full gap-2">
					<PlusCircle className="size-4" />
					Add tier
				</Button>

				{error && <p className="text-destructive text-sm">{error}</p>}

				<Button
					onClick={save}
					disabled={status === "saving"}
					className="w-full sm:w-auto"
				>
					{status === "saving"
						? "Saving..."
						: status === "saved"
							? "Saved"
							: "Save tiers"}
				</Button>
			</CardContent>
		</Card>
	);
};

export { SubscriptionTiersForm };
