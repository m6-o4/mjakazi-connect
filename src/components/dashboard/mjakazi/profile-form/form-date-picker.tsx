"use client";

import { format, parse } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Controller, useFormContext } from "react-hook-form";

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

type FormDatePickerProps = {
	name: "dateOfBirth" | "availableFrom";
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
	const { control, formState } = useFormContext<ProfileFormValues>();
	const errorMessage = formState.errors[name]?.message;

	return (
		<div className="flex flex-col gap-1.5">
			<Label>{label}</Label>
			<Controller
				name={name}
				control={control}
				render={({ field }) => {
					const dateValue = field.value
						? parse(field.value, DATE_FORMAT, new Date())
						: undefined;

					return (
						<Popover>
							<PopoverTrigger
								className={cn(
									buttonVariants({ variant: "outline" }),
									"w-full justify-start font-normal",
									!field.value && "text-muted-foreground",
								)}
							>
								<CalendarIcon />
								{field.value
									? format(parse(field.value, DATE_FORMAT, new Date()), "dd MMM yyyy")
									: placeholder}
							</PopoverTrigger>
							<PopoverContent className="w-auto p-0" align="start">
								<PopoverTitle className="sr-only">{label}</PopoverTitle>
								<Calendar
									mode="single"
									selected={dateValue}
									onSelect={(date) =>
										field.onChange(date ? format(date, DATE_FORMAT) : "")
									}
									captionLayout="dropdown"
									autoFocus
								/>
								{field.value && (
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
					);
				}}
			/>
			{errorMessage && <p className="text-destructive text-xs">{String(errorMessage)}</p>}
		</div>
	);
};

export { FormDatePicker };
