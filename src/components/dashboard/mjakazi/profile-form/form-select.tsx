"use client";

import { useController, useFormContext } from "react-hook-form";

import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ProfileFormValues } from "@/lib/profile-schema";

// the select paths this component serves. employment role is an array path, so
// the union is written explicitly rather than widened to FieldPath
type SelectFieldName =
	| "nationality"
	| "maritalStatus"
	| "religion"
	| "educationLevel"
	| "workPreference"
	| "location"
	| `employmentHistory.${number}.role`;

type FormSelectProps = {
	name: SelectFieldName;
	label: string;
	options: readonly { label: string; value: string }[];
	placeholder?: string;
	required?: boolean;
};

// a single-select field bridged to react-hook-form. an empty value means "not
// set" and is stored as null by the service
const FormSelect = ({ name, label, options, placeholder, required }: FormSelectProps) => {
	const { control } = useFormContext<ProfileFormValues>();
	const { field, fieldState } = useController({ name, control });
	const errorMessage = fieldState.error?.message;

	return (
		<div className="flex flex-col gap-1.5">
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
			<Select
				value={(field.value as string) || null}
				onValueChange={(value) => field.onChange(value ?? "")}
			>
				<SelectTrigger className="w-full">
					<SelectValue placeholder={placeholder ?? "Select..."} />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
			{errorMessage && <p className="text-destructive text-xs">{errorMessage}</p>}
		</div>
	);
};

export { FormSelect };
