"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { submitConciergeBriefAction } from "@/app/actions/concierge";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/lib/notify";
import {
	JOB_OPTIONS,
	LOCATION_OPTIONS,
	WORK_PREFERENCE_OPTIONS,
} from "@/lib/profile-constants";

import { zodResolver } from "@hookform/resolvers/zod";

const briefSchema = z
	.object({
		jobCategory: z.string().min(1, "Job category is required"),
		location: z.string().min(1, "Location is required"),
		workPreference: z.enum(["live_in", "live_out", "either"]),
		salaryMin: z.number().min(1, "Minimum salary is required"),
		salaryMax: z.number().min(1, "Maximum salary is required"),
		familyDetails: z
			.string()
			.min(3, "Family details are required (e.g. 2 adults, 2 kids)"),
		duties: z.string().min(10, "Please describe primary duties (at least 10 characters)"),
		specialRequirements: z.string().optional(),
	})
	.refine((data) => data.salaryMax >= data.salaryMin, {
		message: "Maximum salary must be greater than or equal to minimum salary",
		path: ["salaryMax"],
	});

type BriefFormValues = z.infer<typeof briefSchema>;

type Props = {
	caseId: string;
	initialValues?: Partial<BriefFormValues> | null;
};

const ConciergeBriefForm = ({ caseId, initialValues }: Props) => {
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		setValue,
		watch,
		formState: { errors },
	} = useForm<BriefFormValues>({
		resolver: zodResolver(briefSchema),
		defaultValues: {
			jobCategory: initialValues?.jobCategory ?? "nanny",
			location: initialValues?.location ?? "nairobi",
			workPreference: initialValues?.workPreference ?? "live_in",
			salaryMin: initialValues?.salaryMin ?? 15000,
			salaryMax: initialValues?.salaryMax ?? 25000,
			familyDetails: initialValues?.familyDetails ?? "",
			duties: initialValues?.duties ?? "",
			specialRequirements: initialValues?.specialRequirements ?? "",
		},
	});

	const onSubmit = (values: BriefFormValues) => {
		setError(null);

		startTransition(async () => {
			const res = await submitConciergeBriefAction(caseId, values);
			if (!res.success) {
				setError(res.error);
			} else {
				notifySuccess("Requirements brief submitted", {
					id: "concierge-brief",
					description: "Our staff are now reviewing your case.",
				});
			}
		});
	};

	return (
		<Card className="max-w-2xl">
			<CardHeader>
				<CardTitle>Concierge Requirements Brief</CardTitle>
				<CardDescription>
					Tell us what you are looking for in a domestic worker. Our staff will hand-pick
					and shortlist 3 to 5 verified candidates for you.
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					<div className="grid gap-4 md:grid-cols-2">
						<div className="space-y-2">
							<Label htmlFor="jobCategory">Job Role Needed</Label>
							<Select
								value={watch("jobCategory")}
								onValueChange={(val) => {
									if (val) setValue("jobCategory", val, { shouldValidate: true });
								}}
							>
								<SelectTrigger id="jobCategory">
									<SelectValue placeholder="Select role" />
								</SelectTrigger>
								<SelectContent>
									{JOB_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.jobCategory && (
								<p className="text-destructive text-xs">{errors.jobCategory.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="location">Location</Label>
							<Select
								value={watch("location")}
								onValueChange={(val) => {
									if (val) setValue("location", val, { shouldValidate: true });
								}}
							>
								<SelectTrigger id="location">
									<SelectValue placeholder="Select location" />
								</SelectTrigger>
								<SelectContent>
									{LOCATION_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.location && (
								<p className="text-destructive text-xs">{errors.location.message}</p>
							)}
						</div>
					</div>

					<div className="grid gap-4 md:grid-cols-3">
						<div className="space-y-2">
							<Label htmlFor="workPreference">Work Arrangement</Label>
							<Select
								value={watch("workPreference")}
								onValueChange={(val) => {
									if (val)
										setValue("workPreference", val as "live_in" | "live_out" | "either", {
											shouldValidate: true,
										});
								}}
							>
								<SelectTrigger id="workPreference">
									<SelectValue placeholder="Select arrangement" />
								</SelectTrigger>
								<SelectContent>
									{WORK_PREFERENCE_OPTIONS.map((opt) => (
										<SelectItem key={opt.value} value={opt.value}>
											{opt.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{errors.workPreference && (
								<p className="text-destructive text-xs">
									{errors.workPreference.message}
								</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="salaryMin">Min Salary (KSh/mo)</Label>
							<Input
								id="salaryMin"
								type="number"
								step="500"
								{...register("salaryMin", { valueAsNumber: true })}
							/>
							{errors.salaryMin && (
								<p className="text-destructive text-xs">{errors.salaryMin.message}</p>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="salaryMax">Max Salary (KSh/mo)</Label>
							<Input
								id="salaryMax"
								type="number"
								step="500"
								{...register("salaryMax", { valueAsNumber: true })}
							/>
							{errors.salaryMax && (
								<p className="text-destructive text-xs">{errors.salaryMax.message}</p>
							)}
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="familyDetails">Household / Family Details</Label>
						<Input
							id="familyDetails"
							placeholder="e.g. 2 adults, 2 children (ages 3 and 6), 4-bedroom house"
							{...register("familyDetails")}
						/>
						{errors.familyDetails && (
							<p className="text-destructive text-xs">{errors.familyDetails.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="duties">Primary Duties & Expectations</Label>
						<Textarea
							id="duties"
							rows={4}
							placeholder="Describe daily duties (cooking, laundry, childcare, cleaning, etc.)"
							{...register("duties")}
						/>
						{errors.duties && (
							<p className="text-destructive text-xs">{errors.duties.message}</p>
						)}
					</div>

					<div className="space-y-2">
						<Label htmlFor="specialRequirements">
							Special Requirements / Preferences (Optional)
						</Label>
						<Textarea
							id="specialRequirements"
							rows={2}
							placeholder="e.g. Must speak Fluent English, experience with toddlers, First Aid trained..."
							{...register("specialRequirements")}
						/>
					</div>

					{error && <p className="text-destructive text-sm">{error}</p>}

					<Button type="submit" disabled={isPending} className="w-full sm:w-auto">
						{isPending ? (
							<>
								<Loader2 className="mr-2 size-4 animate-spin" />
								Submitting Brief...
							</>
						) : (
							"Submit Requirements Brief"
						)}
					</Button>
				</form>
			</CardContent>
		</Card>
	);
};

export { ConciergeBriefForm };
