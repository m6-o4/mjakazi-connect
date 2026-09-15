"use client";

import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useController, useFormContext } from "react-hook-form";

import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
	Popover,
	PopoverContent,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import type { ProfileFormValues } from "@/lib/profile-schema";
import { cn } from "@/lib/utils";

// the date paths this picker serves. employment dates are array paths, so the
// union is written explicitly rather than widened to FieldPath — it keeps the
// value typed as a string and documents exactly where the component may be used
type DateFieldName =
	| "dateOfBirth"
	| "availableFrom"
	| `employmentHistory.${number}.startDate`
	| `employmentHistory.${number}.endDate`;

type FormDatePickerProps = {
	name: DateFieldName;
	label: string;
	placeholder?: string;
};

const DATE_FORMAT = "yyyy-MM-dd";

// a shadcn calendar date picker bridged to react-hook-form. stores the value as
// a YYYY-MM-DD string to match the payload date field, and shows a clear button
const FormDatePicker = ({
	name,
	label,
	placeholder = "Pick a date",
}: FormDatePickerProps) => {
	const { control } = useFormContext<ProfileFormValues>();
	const { field, fieldState } = useController({ name, control });
	const value = field.value ?? "";
	const errorMessage = fieldState.error?.message;

	return (
		<div className="flex flex-col gap-1.5">
			<Label>{label}</Label>
			<Popover>
				<PopoverTrigger
					className={cn(
						buttonVariants({ variant: "outline" }),
						"w-full justify-start font-normal",
						!value && "text-muted-foreground",
					)}
				>
					<CalendarIcon />
					{value
						? format(parse(value, DATE_FORMAT, new Date()), "dd MMM yyyy")
						: placeholder}
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="start">
					<PopoverTitle className="sr-only">{label}</PopoverTitle>
					<Calendar
						mode="single"
						selected={value ? parse(value, DATE_FORMAT, new Date()) : undefined}
						onSelect={(date) => field.onChange(date ? format(date, DATE_FORMAT) : "")}
						captionLayout="dropdown"
						autoFocus
					/>
					{value && (
						<div className="border-t p-2">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								className="w-full"
								onClick={() => field.onChange("")}
							>
								Clear
							</Button>
						</div>
					)}
				</PopoverContent>
			</Popover>
			{errorMessage && <p className="text-destructive text-xs">{errorMessage}</p>}
		</div>
	);
};

export { FormDatePicker };
