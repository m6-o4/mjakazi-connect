"use client";

import posthog from "posthog-js";
import { useState } from "react";
import { FormProvider, useForm, useWatch, type FieldErrors } from "react-hook-form";

import { updateProfileAction } from "@/app/actions/profile";
import { FormDatePicker } from "@/components/dashboard/mjakazi/profile-form/form-date-picker";
import { FormSelect } from "@/components/dashboard/mjakazi/profile-form/form-select";
import { OptionChips } from "@/components/dashboard/mjakazi/profile-form/option-chips";
import { PhotoField } from "@/components/dashboard/mjakazi/profile-form/photo-field";
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
import { notifyError, notifyInfo, notifySuccess } from "@/lib/notify";
import {
	COUNTRY_OPTIONS,
	EDUCATION_LEVEL_OPTIONS,
	JOB_OPTIONS,
	LANGUAGE_OPTIONS,
	LOCATION_OPTIONS,
	MARITAL_STATUS_OPTIONS,
	PROFILE_REQUIRED_LABELS,
	PROFILE_UI_REQUIRED_FIELDS,
	RELIGION_OPTIONS,
	WORK_PREFERENCE_OPTIONS,
} from "@/lib/profile-constants";
import {
	ABOUT_MAX_WORDS,
	countWords,
	profileFormSchema,
	type ProfileFormValues,
} from "@/lib/profile-schema";
import { cn } from "@/lib/utils";

import { zodResolver } from "@hookform/resolvers/zod";

// the form's asterisks come from one exported list so they can never drift from
// the completeness checklist
const REQUIRED_FIELD_SET: ReadonlySet<string> = new Set<string>(
	PROFILE_UI_REQUIRED_FIELDS,
);

const requiredMark = (
	<span className="text-destructive" aria-hidden="true">
		{" "}
		*
	</span>
);

type ProfileFormProps = {
	initialValues: ProfileFormValues;
	photo: { id: string; url: string | null } | null;
	initialProfileComplete: boolean;
};

const ProfileForm = ({
	initialValues,
	photo,
	initialProfileComplete,
}: ProfileFormProps) => {
	const [submitting, setSubmitting] = useState(false);
	const [wasComplete, setWasComplete] = useState(initialProfileComplete);

	const methods = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		defaultValues: initialValues,
		// validate as a field is left, then on every change once it has errored,
		// so mistakes surface before the submit button is pressed
		mode: "onTouched",
		reValidateMode: "onChange",
	});

	const {
		register,
		handleSubmit,
		formState: { errors },
	} = methods;

	const aboutValue = useWatch({ control: methods.control, name: "about" }) ?? "";
	const aboutWordCount = countWords(aboutValue);

	// fires once, on the false → true transition, per the posthog event list
	const markComplete = () => {
		if (!wasComplete) {
			posthog.capture("profile_completed");
			setWasComplete(true);
		}
	};

	const onPhotoUploaded = (
		_photo: { id: string; url: string | null },
		profileComplete: boolean,
	) => {
		if (profileComplete) markComplete();
	};

	const onSubmit = async (values: ProfileFormValues) => {
		setSubmitting(true);
		try {
			const result = await updateProfileAction(values);
			if (!result.success) {
				notifyError("Could not save", {
					id: "profile-save",
					description: result.error ?? "Please try again.",
				});
				return;
			}

			const missing = result.missingFields ?? [];
			if (missing.length === 0) {
				notifySuccess("Profile saved", {
					id: "profile-save",
					description: "Your profile is complete and ready for verification.",
				});
				markComplete();
				return;
			}

			notifyInfo("Profile saved", {
				id: "profile-save",
				description: (
					<>
						<p>The following are still needed for verification:</p>
						<ul className="list-disc pl-5">
							{missing.map((field) => (
								<li key={field}>{PROFILE_REQUIRED_LABELS[field]}</li>
							))}
						</ul>
					</>
				),
			});
		} catch {
			notifyError("Could not save", {
				id: "profile-save",
				description: "Please try again.",
			});
		} finally {
			setSubmitting(false);
		}
	};

	// send focus to the first invalid field on a failed submit so the error is
	// never off-screen on a long form. every possible error here is a registered
	// input or textarea, so setFocus resolves reliably
	const onInvalid = (formErrors: FieldErrors<ProfileFormValues>) => {
		const firstError = (Object.keys(formErrors) as (keyof ProfileFormValues)[])[0];
		if (firstError) methods.setFocus(firstError, { shouldSelect: true });
	};

	return (
		<FormProvider {...methods}>
			<form
				onSubmit={handleSubmit(onSubmit, onInvalid)}
				className="flex flex-col gap-6"
				noValidate
			>
				<p className="text-muted-foreground text-xs">
					Fields marked with <span className="text-destructive">*</span> are needed to
					complete your profile. You can save and finish later, they are required before
					you submit for verification.
				</p>
				<Card>
					<CardHeader>
						<CardTitle>Identity</CardTitle>
						<CardDescription>Your name and photo are shown to employers.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<PhotoField photoUrl={photo?.url ?? null} onUploaded={onPhotoUploaded} />

						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="displayName">
									<span>
										Display name
										{REQUIRED_FIELD_SET.has("displayName") && requiredMark}
									</span>
								</Label>
								<Input id="displayName" {...register("displayName")} />
								<p className="text-muted-foreground text-xs">
									Employers see this name on the website. If you do not change it, only
									your first name is shown, a clear name helps you get noticed.
								</p>
								{errors.displayName && (
									<p className="text-destructive text-xs">{errors.displayName.message}</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="legalFirstName">
									<span>
										Legal first name
										{REQUIRED_FIELD_SET.has("legalFirstName") && requiredMark}
									</span>
								</Label>
								<Input id="legalFirstName" {...register("legalFirstName")} />
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="legalLastName">
									<span>
										Legal last name
										{REQUIRED_FIELD_SET.has("legalLastName") && requiredMark}
									</span>
								</Label>
								<Input id="legalLastName" {...register("legalLastName")} />
							</div>

							<FormDatePicker name="dateOfBirth" label="Date of birth" />

							<FormSelect
								name="nationality"
								label="Nationality"
								options={COUNTRY_OPTIONS}
								required={REQUIRED_FIELD_SET.has("nationality")}
							/>

							<FormSelect
								name="maritalStatus"
								label="Marital status"
								options={MARITAL_STATUS_OPTIONS}
							/>

							<FormSelect name="religion" label="Religion" options={RELIGION_OPTIONS} />

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="phone">
									<span>
										Mobile phone number
										{REQUIRED_FIELD_SET.has("phone") && requiredMark}
									</span>
								</Label>
								<Input
									id="phone"
									type="tel"
									placeholder="0712 345 678"
									{...register("phone")}
								/>
								{errors.phone && (
									<p className="text-destructive text-xs">{errors.phone.message}</p>
								)}
							</div>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Professional</CardTitle>
						<CardDescription>
							What you can do and how you describe yourself.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<OptionChips
							name="jobsSkills"
							label="Jobs / skills"
							options={JOB_OPTIONS}
							required={REQUIRED_FIELD_SET.has("jobsSkills")}
						/>

						<div className="flex flex-col gap-1.5">
							<Label htmlFor="about">
								<span>
									About me
									{REQUIRED_FIELD_SET.has("about") && requiredMark}
								</span>
							</Label>
							<Textarea
								id="about"
								placeholder="Describe your experience and what you are good at."
								{...register("about")}
							/>
							<div className="flex items-center justify-between gap-2">
								<span className="text-muted-foreground text-xs">
									Describe your skills and experience briefly.
								</span>
								<span
									className={cn(
										"shrink-0 text-xs",
										aboutWordCount > ABOUT_MAX_WORDS
											? "text-destructive font-medium"
											: "text-muted-foreground",
									)}
								>
									{aboutWordCount}/{ABOUT_MAX_WORDS} words
								</span>
							</div>
							{errors.about && (
								<p className="text-destructive text-xs">{errors.about.message}</p>
							)}
						</div>

						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="yearsExperience">
									<span>
										Years of experience
										{REQUIRED_FIELD_SET.has("yearsExperience") && requiredMark}
									</span>
								</Label>
								<Input
									id="yearsExperience"
									type="number"
									min={0}
									{...register("yearsExperience", {
										setValueAs: (value) => (value === "" ? undefined : Number(value)),
									})}
								/>
								{errors.yearsExperience && (
									<p className="text-destructive text-xs">
										{errors.yearsExperience.message}
									</p>
								)}
							</div>

							<FormSelect
								name="educationLevel"
								label="Education level"
								options={EDUCATION_LEVEL_OPTIONS}
							/>
						</div>

						<OptionChips
							name="languages"
							label="Languages spoken"
							options={LANGUAGE_OPTIONS}
							required={REQUIRED_FIELD_SET.has("languages")}
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Work</CardTitle>
						<CardDescription>How and where you want to work.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="grid gap-4 md:grid-cols-2">
							<FormSelect
								name="workPreference"
								label="Work preference"
								options={WORK_PREFERENCE_OPTIONS}
								required={REQUIRED_FIELD_SET.has("workPreference")}
							/>

							<FormDatePicker name="availableFrom" label="Available from" />

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="salaryMin">Minimum salary (KSh)</Label>
								<Input
									id="salaryMin"
									type="number"
									min={0}
									{...register("salaryMin", {
										setValueAs: (value) => (value === "" ? undefined : Number(value)),
									})}
								/>
								{errors.salaryMin && (
									<p className="text-destructive text-xs">{errors.salaryMin.message}</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="salaryMax">Maximum salary (KSh)</Label>
								<Input
									id="salaryMax"
									type="number"
									min={0}
									{...register("salaryMax", {
										setValueAs: (value) => (value === "" ? undefined : Number(value)),
									})}
								/>
								{errors.salaryMax && (
									<p className="text-destructive text-xs">{errors.salaryMax.message}</p>
								)}
							</div>

							<FormSelect
								name="location"
								label="Location"
								options={LOCATION_OPTIONS}
								required={REQUIRED_FIELD_SET.has("location")}
							/>
						</div>
					</CardContent>
				</Card>

				<Button type="submit" disabled={submitting}>
					{submitting ? "Saving..." : "Save profile"}
				</Button>
			</form>
		</FormProvider>
	);
};

export { ProfileForm };
