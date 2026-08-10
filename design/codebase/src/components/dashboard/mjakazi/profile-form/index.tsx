"use client";

import { Button } from "@/components/ui/button";
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
import { Camera, CheckCircle2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

interface ProfileFormProps {
	currentDisplayName: string;
	currentPhotoUrl: string | null;
	currentPhotoId: string | null;
	currentBio: string;
	currentJobs: string[];
	currentExperience: number | null;
	currentEducationLevel: string;
	currentLanguages: string[];
	currentWorkPreference: string;
	currentAvailableFrom: string;
	currentSalaryMin: number | null;
	currentSalaryMax: number | null;
	currentLocation: string;
	currentNationality: string;
	currentDateOfBirth: string;
	currentMaritalStatus: string;
	currentReligion: string;
	currentPhoneNumber: string;
}

const toggleMultiSelect = (current: string[], value: string): string[] =>
	current.includes(value) ? current.filter((v) => v !== value) : [...current, value];

const toDateInputValue = (isoString: string | null | undefined): string => {
	if (!isoString) return "";
	return isoString.slice(0, 10);
};

const ProfileForm = ({
	currentDisplayName,
	currentPhotoUrl,
	currentPhotoId,
	currentBio,
	currentJobs,
	currentExperience,
	currentEducationLevel,
	currentLanguages,
	currentWorkPreference,
	currentAvailableFrom,
	currentSalaryMin,
	currentSalaryMax,
	currentLocation,
	currentNationality,
	currentDateOfBirth,
	currentMaritalStatus,
	currentReligion,
	currentPhoneNumber,
}: ProfileFormProps) => {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [displayName, setDisplayName] = useState(
		currentDisplayName === "New Worker" ? "" : currentDisplayName,
	);
	const [bio, setBio] = useState(currentBio ?? "");
	const [jobs, setJobs] = useState<string[]>(currentJobs ?? []);
	const [experience, setExperience] = useState<string>(
		currentExperience !== null ? String(currentExperience) : "",
	);
	const [educationLevel, setEducationLevel] = useState(currentEducationLevel ?? "");
	const [languages, setLanguages] = useState<string[]>(currentLanguages ?? []);
	const [workPreference, setWorkPreference] = useState(currentWorkPreference ?? "");
	const [availableFrom, setAvailableFrom] = useState(
		toDateInputValue(currentAvailableFrom) ?? "",
	);
	const [salaryMin, setSalaryMin] = useState<string>(
		currentSalaryMin !== null ? String(currentSalaryMin) : "",
	);
	const [salaryMax, setSalaryMax] = useState<string>(
		currentSalaryMax !== null ? String(currentSalaryMax) : "",
	);
	const [location, setLocation] = useState(currentLocation ?? "");
	const [nationality, setNationality] = useState(currentNationality ?? "");
	const [dateOfBirth, setDateOfBirth] = useState(
		toDateInputValue(currentDateOfBirth) ?? "",
	);
	const [maritalStatus, setMaritalStatus] = useState(currentMaritalStatus ?? "");
	const [religion, setReligion] = useState(currentReligion ?? "");
	const [phoneNumber, setPhoneNumber] = useState(currentPhoneNumber ?? "");

	const [photoFile, setPhotoFile] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(currentPhotoUrl);

	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0] ?? null;
		if (!file) return;
		if (file.size > 5 * 1024 * 1024) {
			setError("Photo must be under 5MB.");
			return;
		}
		if (!file.type.startsWith("image/")) {
			setError("Only image files are accepted.");
			return;
		}
		setError(null);
		setPhotoFile(file);
		setPhotoPreview(URL.createObjectURL(file));
	};

	const uploadPhoto = async (): Promise<string | null> => {
		if (!photoFile) return null;

		const formData = new FormData();
		formData.append("file", photoFile);

		if (currentPhotoId) {
			formData.append("existingPhotoId", currentPhotoId);
		}

		const res = await fetch("/apis/profile/upload-photo", {
			method: "POST",
			body: formData,
		});

		if (!res.ok) {
			const data = await res.json();
			throw new Error(data.error ?? "Photo upload failed. Please try again.");
		}

		const data = await res.json();
		return data.photoId ?? null;
	};

	const handleSave = async () => {
		if (!displayName.trim()) {
			setError("Display name is required.");
			return;
		}
		setLoading(true);
		setError(null);
		setTimeout(() => setSuccess(false), 3000);

		try {
			let photoId: string | null = null;
			if (photoFile) photoId = await uploadPhoto();

			const res = await fetch("/apis/profile/update-mjakazi-profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					displayName: displayName.trim(),
					bio: bio.trim(),
					jobs,
					experience: experience !== "" ? Number(experience) : null,
					educationLevel: educationLevel || undefined,
					languages,
					workPreference: workPreference || undefined,
					availableFrom: availableFrom || undefined,
					salaryMin: salaryMin !== "" ? Number(salaryMin) : null,
					salaryMax: salaryMax !== "" ? Number(salaryMax) : null,
					location: location || undefined,
					nationality: nationality || undefined,
					dateOfBirth: dateOfBirth || undefined,
					maritalStatus: maritalStatus || undefined,
					religion: religion || undefined,
					phoneNumber: phoneNumber.trim() || undefined,
					...(photoId ? { photoId } : {}),
				}),
			});

			if (res.ok) {
				setSuccess(true);
				setPhotoFile(null);
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Failed to save. Please try again.");
			}
		} catch (err: any) {
			setError(err.message ?? "Something went wrong.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="flex flex-col gap-6">
			{success && (
				<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
					<CheckCircle2 className="text-accent size-5 shrink-0" />
					<p className="text-accent text-sm font-medium">Profile saved successfully.</p>
				</div>
			)}

			{error && <p className="text-destructive text-sm">{error}</p>}

			{/* ── section 1: public presentation ── */}
			<div className="bg-card border-border flex flex-col gap-5 rounded-xl border p-6">
				<p className="text-foreground text-sm font-semibold">Public Presentation</p>

				<div className="flex flex-col gap-3">
					<Label className="text-xs">Profile Photo</Label>
					<div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
						<button
							type="button"
							onClick={() => fileInputRef.current?.click()}
							className="border-border bg-muted/40 hover:bg-muted hover:border-primary/40 group relative flex h-30 w-30 shrink-0 flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-all duration-200"
						>
							{photoPreview ? (
								<>
									<img
										src={photoPreview}
										alt="Profile preview"
										className="h-full w-full object-cover"
									/>
									<div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
										<Camera className="size-6 text-white" />
										<span className="text-xs font-medium text-white">Change</span>
									</div>
								</>
							) : (
								<div className="flex flex-col items-center gap-2 px-3 text-center">
									<div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
										<Camera className="text-primary size-5" />
									</div>
									<span className="text-muted-foreground text-xs leading-tight">
										Click to upload
									</span>
								</div>
							)}
						</button>
						<div className="flex flex-col gap-2 text-center sm:text-left">
							<p className="text-foreground text-sm font-medium">Passport-sized photo</p>
							<ul className="text-muted-foreground space-y-0.5 text-xs">
								<li>— Face clearly visible, no sunglasses</li>
								<li>— Plain or neutral background</li>
								<li>— JPG, PNG or WebP · Max 5MB</li>
							</ul>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => fileInputRef.current?.click()}
								className="mt-1 w-fit text-xs"
							>
								{photoPreview ? "Change Photo" : "Choose File"}
							</Button>
						</div>
					</div>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/jpeg,image/png,image/webp"
						onChange={handlePhotoChange}
						className="sr-only"
					/>
				</div>

				{/* display name */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="displayName" className="text-xs">
						Display Name
					</Label>
					<Input
						id="displayName"
						placeholder="Your professional name"
						value={displayName}
						onChange={(e) => setDisplayName(e.target.value)}
						className="text-sm"
					/>
					<p className="text-muted-foreground text-xs">
						This name appears on your public profile.
					</p>
				</div>

				{/* bio */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="bio" className="text-xs">
						About Me
					</Label>
					<Textarea
						id="bio"
						placeholder="Tell potential employers about yourself, your experience, and what makes you a great hire..."
						value={bio}
						onChange={(e) => setBio(e.target.value)}
						className="min-h-30 text-sm"
					/>
				</div>
			</div>

			{/* ── section 2: personal details ── */}
			<div className="bg-card border-border flex flex-col gap-5 rounded-xl border p-6">
				<p className="text-foreground text-sm font-semibold">Personal Details</p>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="dateOfBirth" className="text-xs">
							Date of Birth
						</Label>
						<Input
							id="dateOfBirth"
							type="date"
							value={dateOfBirth}
							onChange={(e) => setDateOfBirth(e.target.value)}
							className="text-sm"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="nationality" className="text-xs">
							Nationality
						</Label>
						<select
							id="nationality"
							value={nationality}
							onChange={(e) => setNationality(e.target.value)}
							className="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						>
							<option value="">Select nationality</option>
							{COUNTRY_OPTIONS.map((c) => (
								<option key={c.value} value={c.value}>
									{c.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="maritalStatus" className="text-xs">
							Marital Status
							<span className="text-muted-foreground ml-1">(optional)</span>
						</Label>
						<select
							id="maritalStatus"
							value={maritalStatus}
							onChange={(e) => setMaritalStatus(e.target.value)}
							className="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						>
							<option value="">Prefer not to say</option>
							{MARITAL_STATUS_OPTIONS.map((m) => (
								<option key={m.value} value={m.value}>
									{m.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="religion" className="text-xs">
							Religion
							<span className="text-muted-foreground ml-1">(optional)</span>
						</Label>
						<select
							id="religion"
							value={religion}
							onChange={(e) => setReligion(e.target.value)}
							className="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						>
							<option value="">Prefer not to say</option>
							{RELIGION_OPTIONS.map((r) => (
								<option key={r.value} value={r.value}>
									{r.label}
								</option>
							))}
						</select>
					</div>
				</div>

				{/* phone number */}
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="phoneNumber" className="text-xs">
						Mobile Phone Number
					</Label>
					<Input
						id="phoneNumber"
						type="tel"
						placeholder="e.g. 0712 345 678"
						value={phoneNumber}
						onChange={(e) => setPhoneNumber(e.target.value)}
						className="text-sm"
					/>
					<p className="text-muted-foreground text-xs">
						Visible only to subscribed employers. Used for direct contact.
					</p>
				</div>

				{/* languages */}
				<div className="flex flex-col gap-2">
					<Label className="text-xs">
						Languages Spoken
						<span className="text-muted-foreground ml-1">(select all that apply)</span>
					</Label>
					<div className="flex flex-wrap gap-2">
						{LANGUAGE_OPTIONS.map((lang) => {
							const selected = languages.includes(lang.value);
							return (
								<button
									key={lang.value}
									type="button"
									onClick={() => setLanguages(toggleMultiSelect(languages, lang.value))}
									className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
										selected
											? "bg-primary border-primary text-primary-foreground"
											: "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
									}`}
								>
									{lang.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			{/* ── section 3: work preferences ── */}
			<div className="bg-card border-border flex flex-col gap-5 rounded-xl border p-6">
				<p className="text-foreground text-sm font-semibold">Work Preferences</p>

				<div className="flex flex-col gap-2">
					<Label className="text-xs">
						What I Can Help With
						<span className="text-muted-foreground ml-1">(select all that apply)</span>
					</Label>
					<div className="flex flex-wrap gap-2">
						{JOB_OPTIONS.map((job) => {
							const selected = jobs.includes(job.value);
							return (
								<button
									key={job.value}
									type="button"
									onClick={() => setJobs(toggleMultiSelect(jobs, job.value))}
									className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
										selected
											? "bg-primary border-primary text-primary-foreground"
											: "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
									}`}
								>
									<span>{job.icon}</span>
									{job.label}
								</button>
							);
						})}
					</div>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="workPreference" className="text-xs">
							Live-in or Live-out
						</Label>
						<select
							id="workPreference"
							value={workPreference}
							onChange={(e) => setWorkPreference(e.target.value)}
							className="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						>
							<option value="">Select preference</option>
							{WORK_PREFERENCE_OPTIONS.map((w) => (
								<option key={w.value} value={w.value}>
									{w.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="location" className="text-xs">
							Location / City Available to Work
						</Label>
						<select
							id="location"
							value={location}
							onChange={(e) => setLocation(e.target.value)}
							className="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
						>
							<option value="">Select location</option>
							{LOCATION_OPTIONS.map((l) => (
								<option key={l.value} value={l.value}>
									{l.label}
								</option>
							))}
						</select>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="availableFrom" className="text-xs">
							Available From
						</Label>
						<Input
							id="availableFrom"
							type="date"
							value={availableFrom}
							onChange={(e) => setAvailableFrom(e.target.value)}
							className="text-sm"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="experience" className="text-xs">
							Years of Experience
						</Label>
						<Input
							id="experience"
							type="number"
							min="0"
							placeholder="e.g. 3"
							value={experience}
							onChange={(e) => setExperience(e.target.value)}
							className="text-sm"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="salaryMin" className="text-xs">
							Min Expected Salary (KSh / month)
						</Label>
						<Input
							id="salaryMin"
							type="number"
							min="0"
							placeholder="e.g. 15000"
							value={salaryMin}
							onChange={(e) => setSalaryMin(e.target.value)}
							className="text-sm"
						/>
					</div>

					<div className="flex flex-col gap-1.5">
						<Label htmlFor="salaryMax" className="text-xs">
							Max Expected Salary (KSh / month)
						</Label>
						<Input
							id="salaryMax"
							type="number"
							min="0"
							placeholder="e.g. 25000"
							value={salaryMax}
							onChange={(e) => setSalaryMax(e.target.value)}
							className="text-sm"
						/>
					</div>
				</div>
			</div>

			{/* ── section 4: education ── */}
			<div className="bg-card border-border flex flex-col gap-5 rounded-xl border p-6">
				<p className="text-foreground text-sm font-semibold">Education</p>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="educationLevel" className="text-xs">
						Highest Education Level
					</Label>
					<select
						id="educationLevel"
						value={educationLevel}
						onChange={(e) => setEducationLevel(e.target.value)}
						className="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
					>
						<option value="">Select education level</option>
						{EDUCATION_LEVEL_OPTIONS.map((e) => (
							<option key={e.value} value={e.value}>
								{e.label}
							</option>
						))}
					</select>
				</div>
			</div>

			<Button onClick={handleSave} disabled={loading} className="w-full gap-2">
				<UserCheck className="size-4" />
				{loading ? "Saving..." : "Save Profile"}
			</Button>
		</div>
	);
};

export { ProfileForm };
