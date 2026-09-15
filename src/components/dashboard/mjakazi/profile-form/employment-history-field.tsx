"use client";

import { Plus, Trash2 } from "lucide-react";
import { useFieldArray, useFormContext } from "react-hook-form";

import { FormDatePicker } from "@/components/dashboard/mjakazi/profile-form/form-date-picker";
import { FormSelect } from "@/components/dashboard/mjakazi/profile-form/form-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { JOB_OPTIONS, MAX_EMPLOYMENT_ENTRIES } from "@/lib/profile-constants";
import type { ProfileFormValues } from "@/lib/profile-schema";

// the repeatable editor for previous placements. optional display content, so no
// field here is marked required — but a row the user starts filling must be
// completed, which the shared schema enforces. a row left completely empty is
// dropped on save rather than reported as an error
const EmploymentHistoryField = () => {
	const { control, register } = useFormContext<ProfileFormValues>();
	const { fields, append, remove } = useFieldArray({
		control,
		name: "employmentHistory",
	});

	const atLimit = fields.length >= MAX_EMPLOYMENT_ENTRIES;

	const addEntry = () => append({ employer: "", role: "", startDate: "", endDate: "" });

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-col gap-1">
				<span className="text-sm font-semibold">
					Employment history{" "}
					<span className="text-muted-foreground font-normal">(optional)</span>
				</span>
				<p className="text-muted-foreground text-xs">
					List up to {MAX_EMPLOYMENT_ENTRIES} previous placements. Employers see these on
					your profile. Each placement is only shown once every field in it is filled in.
				</p>
			</div>

			{fields.length === 0 ? (
				<p className="text-muted-foreground text-xs">No previous placements added yet.</p>
			) : (
				<div className="flex flex-col gap-4">
					{fields.map((field, index) => (
						<div
							key={field.id}
							className="border-border flex flex-col gap-4 rounded-lg border p-4"
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-muted-foreground text-xs font-medium">
									Placement {index + 1}
								</span>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => remove(index)}
								>
									<Trash2 />
									Remove
								</Button>
							</div>

							<div className="grid gap-4 md:grid-cols-2">
								<div className="flex flex-col gap-1.5 md:col-span-2">
									<Label htmlFor={`employment-${index}-employer`}>Employer</Label>
									<Input
										id={`employment-${index}-employer`}
										placeholder="A family in Kilimani"
										{...register(`employmentHistory.${index}.employer`)}
									/>
									<p className="text-muted-foreground text-xs">
										A short description is enough. Do not enter anyone&apos;s full name or
										contact details.
									</p>
								</div>

								<FormDatePicker
									name={`employmentHistory.${index}.startDate`}
									label="Start date"
								/>

								<FormDatePicker
									name={`employmentHistory.${index}.endDate`}
									label="End date"
								/>

								<FormSelect
									name={`employmentHistory.${index}.role`}
									label="Role"
									options={JOB_OPTIONS}
								/>
							</div>
						</div>
					))}
				</div>
			)}

			<div className="flex flex-wrap items-center gap-3">
				<Button type="button" variant="outline" onClick={addEntry} disabled={atLimit}>
					<Plus />
					Add placement
				</Button>
				{atLimit && (
					<p className="text-muted-foreground text-xs">
						You have listed the maximum of {MAX_EMPLOYMENT_ENTRIES} placements.
					</p>
				)}
			</div>
		</div>
	);
};

export { EmploymentHistoryField };
