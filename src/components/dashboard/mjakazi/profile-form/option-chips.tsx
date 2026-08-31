"use client";

import { useController, useFormContext } from "react-hook-form";

import { Label } from "@/components/ui/label";
import type { ProfileFormValues } from "@/lib/profile-schema";
import { cn } from "@/lib/utils";

type OptionChipsProps = {
	name: "jobsSkills" | "languages";
	label: string;
	options: readonly { label: string; value: string }[];
	required?: boolean;
};

// tap-to-toggle chips for the two multi-select fields. plain buttons, not a
// dropdown, so a worker sees every option at once and cannot mis-enter a value
const OptionChips = ({ name, label, options, required }: OptionChipsProps) => {
	const { control } = useFormContext<ProfileFormValues>();
	const { field, fieldState } = useController({ name, control });

	const selected: string[] = Array.isArray(field.value) ? (field.value as string[]) : [];

	const toggle = (optionValue: string) => {
		const next = selected.includes(optionValue)
			? selected.filter((value) => value !== optionValue)
			: [...selected, optionValue];
		field.onChange(next);
	};

	return (
		<div className="flex flex-col gap-2">
			<Label>
				<span>
					{label}
					{required && (
						<span className="text-destructive" aria-hidden="true">
							{" "}
							*
						</span>
					)}
				</span>
			</Label>
			<div className="flex flex-wrap gap-2">
				{options.map((option) => {
					const isSelected = selected.includes(option.value);
					return (
						<button
							key={option.value}
							type="button"
							aria-pressed={isSelected}
							onClick={() => toggle(option.value)}
							className={cn(
								"cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
								isSelected
									? "border-primary bg-primary text-primary-foreground"
									: "border-border text-foreground hover:bg-muted",
							)}
						>
							{option.label}
						</button>
					);
				})}
			</div>
			{fieldState.error && (
				<p className="text-destructive text-xs">{fieldState.error.message}</p>
			)}
		</div>
	);
};

export { OptionChips };
