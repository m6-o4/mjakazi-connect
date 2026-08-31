"use client";

import { Controller, useFormContext } from "react-hook-form";

import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { ProfileFormValues } from "@/lib/profile-schema";

type FormSelectProps = {
	name:
		| "nationality"
		| "maritalStatus"
		| "religion"
		| "educationLevel"
		| "workPreference"
		| "location";
	label: string;
	options: readonly { label: string; value: string }[];
	placeholder?: string;
	required?: boolean;
};

// a single-select field bridged to react-hook-form. an empty value means "not
// set" and is stored as null by the service
const FormSelect = ({ name, label, options, placeholder, required }: FormSelectProps) => {
	const { control, formState } = useFormContext<ProfileFormValues>();
	const errorMessage = formState.errors[name]?.message;

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
			<Controller
				name={name}
				control={control}
				render={({ field }) => (
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
				)}
			/>
			{errorMessage && <p className="text-destructive text-xs">{String(errorMessage)}</p>}
		</div>
	);
};

export { FormSelect };
