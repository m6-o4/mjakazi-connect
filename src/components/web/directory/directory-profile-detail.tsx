import {
	ArrowLeft,
	BadgeCheck,
	Briefcase,
	Calendar,
	GraduationCap,
	Languages,
	MapPin,
	Wallet,
} from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	EDUCATION_LEVEL_OPTIONS,
	JOB_OPTIONS,
	LANGUAGE_OPTIONS,
	LOCATION_OPTIONS,
	WORK_PREFERENCE_OPTIONS,
} from "@/lib/profile-constants";
import type { DirectoryProfile } from "@/services/directory.service";

type DirectoryProfileDetailProps = {
	profile: DirectoryProfile;
};

const labelFor = (
	options: readonly { label: string; value: string }[],
	value: string | null | undefined,
): string | null =>
	value ? (options.find((option) => option.value === value)?.label ?? value) : null;

const formatSalary = (profile: DirectoryProfile): string | null => {
	const { salaryMin, salaryMax } = profile;
	if (salaryMin != null && salaryMax != null) {
		return `KSh ${salaryMin.toLocaleString("en-KE")} – ${salaryMax.toLocaleString("en-KE")} / month`;
	}
	if (salaryMin != null) return `From KSh ${salaryMin.toLocaleString("en-KE")} / month`;
	if (salaryMax != null) return `Up to KSh ${salaryMax.toLocaleString("en-KE")} / month`;
	return null;
};

const DirectoryProfileDetail = ({ profile }: DirectoryProfileDetailProps) => {
	const name = profile.displayName ?? "";
	const photoUrl =
		profile.photo && typeof profile.photo === "object"
			? (profile.photo.url ?? null)
			: null;

	const jobLabels = Array.isArray(profile.jobsSkills)
		? profile.jobsSkills.map(
				(job) => JOB_OPTIONS.find((option) => option.value === job)?.label ?? job,
			)
		: [];

	const languageLabels = Array.isArray(profile.languages)
		? profile.languages
				.map(
					(lang) =>
						LANGUAGE_OPTIONS.find((option) => option.value === lang)?.label ?? lang,
				)
				.join(", ")
		: null;

	const locationLabel = labelFor(LOCATION_OPTIONS, profile.location);
	const educationLabel = labelFor(EDUCATION_LEVEL_OPTIONS, profile.educationLevel);
	const workPreferenceLabel = labelFor(WORK_PREFERENCE_OPTIONS, profile.workPreference);
	const salaryLabel = formatSalary(profile);

	const availableFrom = profile.availableFrom
		? new Date(profile.availableFrom).toLocaleDateString("en-KE", {
				day: "numeric",
				month: "short",
				year: "numeric",
			})
		: null;

	return (
		<div className="flex flex-col gap-8">
			<Link
				href="/directory"
				className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1.5 text-sm transition-colors"
			>
				<ArrowLeft className="size-4" />
				Back to directory
			</Link>

			<div className="grid gap-8 lg:grid-cols-3">
				<div className="bg-muted relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-xl lg:col-span-1 lg:mx-0 lg:max-w-none">
					{photoUrl ? (
						<>
							{/* eslint-disable-next-line @next/next/no-img-element -- profile photos live on s3/r2, not the image optimizer */}
							<img
								src={photoUrl}
								alt={`${name}'s profile photo`}
								className="h-full w-full object-cover"
							/>
							<div className="bg-primary/10 absolute inset-0" />
						</>
					) : (
						<div className="from-primary/10 to-primary/20 flex h-full w-full items-center justify-center bg-linear-to-br">
							<span className="text-heading/40 text-6xl font-semibold">
								{name[0]?.toUpperCase() ?? "?"}
							</span>
						</div>
					)}
				</div>

				<div className="flex min-w-0 flex-col gap-6 lg:col-span-2">
					<div>
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="text-heading text-3xl font-semibold wrap-break-word md:text-4xl">
								{name}
							</h1>
							<span className="border-border bg-card text-success inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium">
								<BadgeCheck className="size-3" />
								Verified
							</span>
						</div>
						{workPreferenceLabel ? (
							<p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
								<Briefcase className="size-4" />
								{workPreferenceLabel}
							</p>
						) : null}
					</div>

					{profile.about ? (
						<div>
							<h2 className="text-heading mb-2 text-lg font-semibold">About</h2>
							<p className="text-foreground text-sm leading-relaxed wrap-break-word">
								{profile.about}
							</p>
						</div>
					) : null}

					<div className="grid gap-3 sm:grid-cols-2">
						{locationLabel ? (
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<MapPin className="text-primary size-4 shrink-0" />
								{locationLabel}
							</div>
						) : null}
						{profile.yearsExperience !== null && profile.yearsExperience !== undefined ? (
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<Calendar className="text-primary size-4 shrink-0" />
								{profile.yearsExperience === 1
									? "1 year"
									: `${profile.yearsExperience} years`}{" "}
								experience
							</div>
						) : null}
						{educationLabel ? (
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<GraduationCap className="text-primary size-4 shrink-0" />
								{educationLabel}
							</div>
						) : null}
						{languageLabels ? (
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<Languages className="text-primary size-4 shrink-0" />
								{languageLabels}
							</div>
						) : null}
						{salaryLabel ? (
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<Wallet className="text-primary size-4 shrink-0" />
								{salaryLabel}
							</div>
						) : null}
						{availableFrom ? (
							<div className="text-muted-foreground flex items-center gap-2 text-sm">
								<Calendar className="text-primary size-4 shrink-0" />
								Available from {availableFrom}
							</div>
						) : null}
					</div>

					{jobLabels.length > 0 ? (
						<div className="flex flex-wrap gap-2">
							{jobLabels.map((label) => (
								<Badge key={label} variant="outline" className="text-muted-foreground">
									{label}
								</Badge>
							))}
						</div>
					) : null}

					<Card className="mt-2">
						<CardContent className="flex flex-col gap-3 py-6">
							<h2 className="text-heading text-lg font-semibold">
								Want to contact {name}?
							</h2>
							<p className="text-muted-foreground text-sm">
								Phone and email are shared with subscribed waajiri only. Create an account
								to unlock contact details.
							</p>
							<div className="flex flex-col gap-2 sm:flex-row sm:items-center">
								<Link
									href="/sign-up?role=mwajiri"
									className={buttonVariants({
										className:
											"bg-accent text-accent-foreground hover:bg-accent/90 font-semibold",
									})}
								>
									Join as a mwajiri
								</Link>
								<Link href="/sign-in" className={buttonVariants({ variant: "outline" })}>
									Sign in
								</Link>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
};

export { DirectoryProfileDetail };
