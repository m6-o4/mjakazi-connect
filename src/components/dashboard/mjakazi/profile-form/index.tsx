"use client";

import { useState } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import posthog from "posthog-js";

import { updateProfileAction } from "@/app/actions/profile";
import { FormDatePicker } from "@/components/dashboard/mjakazi/profile-form/form-date-picker";
import { FormSelect } from "@/components/dashboard/mjakazi/profile-form/form-select";
import { OptionChips } from "@/components/dashboard/mjakazi/profile-form/option-chips";
import { PhotoField } from "@/components/dashboard/mjakazi/profile-form/photo-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	COUNTRY_OPTIONS,
	EDUCATION_LEVEL_OPTIONS,
	JOB_OPTIONS,
	LANGUAGE_OPTIONS,
	LOCATION_OPTIONS,
	MARITAL_STATUS_OPTIONS,
	RELIGION_OPTIONS,
	WORK_PREFERENCE_OPTIONS,
} from "@/lib/profile-constants";
import { ABOUT_MAX_WORDS, countWords, profileFormSchema, type ProfileFormValues } from "@/lib/profile-schema";
import { cn } from "@/lib/utils";

type ProfileFormProps = {
	initialValues: ProfileFormValues;
	photo: { id: string; url: string | null } | null;
	initialProfileComplete: boolean;
};

const ProfileForm = ({ initialValues, photo, initialProfileComplete }: ProfileFormProps) => {
	const [submitting, setSubmitting] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);
	const [wasComplete, setWasComplete] = useState(initialProfileComplete);

	const methods = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		defaultValues: initialValues,
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
		setSaveError(null);
		setSaved(false);
		try {
			const result = await updateProfileAction(values);
			if (result.success) {
				setSaved(true);
				if (result.profileComplete) markComplete();
			} else {
				setSaveError(result.error ?? "Could not save your profile.");
			}
		} catch {
			setSaveError("Could not save your profile.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<FormProvider {...methods}>
			<form
				onSubmit={handleSubmit(onSubmit)}
				className="flex flex-col gap-6"
				noValidate
			>
				<Card>
					<CardHeader>
						<CardTitle>Identity</CardTitle>
						<CardDescription>
							Your name and photo are shown to employers.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<PhotoField photoUrl={photo?.url ?? null} onUploaded={onPhotoUploaded} />

						<div className="grid gap-4 md:grid-cols-2">
							<div className="flex flex-col gap-1.5">
								<Label htmlFor="displayName">Display name</Label>
								<Input id="displayName" {...register("displayName")} />
								{errors.displayName && (
									<p className="text-destructive text-xs">
										{errors.displayName.message}
									</p>
								)}
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="legalFirstName">Legal first name</Label>
								<Input id="legalFirstName" {...register("legalFirstName")} />
							</div>

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="legalLastName">Legal last name</Label>
								<Input id="legalLastName" {...register("legalLastName")} />
							</div>

							<FormDatePicker name="dateOfBirth" label="Date of birth" />

							<FormSelect
								name="nationality"
								label="Nationality"
								options={COUNTRY_OPTIONS}
							/>

							<FormSelect
								name="maritalStatus"
								label="Marital status"
								options={MARITAL_STATUS_OPTIONS}
							/>

							<FormSelect name="religion" label="Religion" options={RELIGION_OPTIONS} />

							<div className="flex flex-col gap-1.5">
								<Label htmlFor="phone">Mobile phone number</Label>
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
						<OptionChips name="jobsSkills" label="Jobs / skills" options={JOB_OPTIONS} />

						<div className="flex flex-col gap-1.5">
							<Label htmlFor="about">About me</Label>
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
								<Label htmlFor="yearsExperience">Years of experience</Label>
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

						<OptionChips name="languages" label="Languages spoken" options={LANGUAGE_OPTIONS} />
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

							<FormSelect name="location" label="Location" options={LOCATION_OPTIONS} />
						</div>
					</CardContent>
				</Card>

				<div className="flex items-center gap-3">
					<Button type="submit" disabled={submitting}>
						{submitting ? "Saving..." : "Save profile"}
					</Button>
					{saved && <p className="text-success text-sm font-medium">Profile saved.</p>}
					{saveError && <p className="text-destructive text-sm">{saveError}</p>}
				</div>
			</form>
		</FormProvider>
	);
};

export { ProfileForm };
