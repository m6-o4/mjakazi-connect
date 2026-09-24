import { ExternalLink, FileText, ShieldCheck, UserCheck } from "lucide-react";
import Link from "next/link";

import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { VERIFICATION_BADGE } from "@/lib/account-badges";
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
import type { WajakaziProfile } from "@/payload-types";

type Option = { label: string; value: string };

type Props = {
	profile: WajakaziProfile;
	email: string | null;
};

const labelFor = (
	options: readonly Option[],
	value: string | null | undefined,
): string =>
	value ? (options.find((option) => option.value === value)?.label ?? value) : "Not set";

const formatDate = (value: string | null | undefined): string =>
	value
		? new Intl.DateTimeFormat("en-GB", {
				day: "numeric",
				month: "short",
				year: "numeric",
				timeZone: "Africa/Nairobi",
			}).format(new Date(value))
		: "Not set";

const formatSalary = (profile: WajakaziProfile): string => {
	const { salaryMin, salaryMax } = profile;
	if (salaryMin != null && salaryMax != null) {
		return `KSh ${salaryMin.toLocaleString("en-KE")} – ${salaryMax.toLocaleString("en-KE")} / month`;
	}
	if (salaryMin != null) return `From KSh ${salaryMin.toLocaleString("en-KE")} / month`;
	if (salaryMax != null) return `Up to KSh ${salaryMax.toLocaleString("en-KE")} / month`;
	return "Not set";
};

const DetailRow = ({ label, value }: { label: string; value: string }) => (
	<div>
		<p className="text-muted-foreground text-xs">{label}</p>
		<p className="text-foreground text-sm font-medium wrap-break-word">{value}</p>
	</div>
);

// read-only staff view of a shortlist candidate. shows the whole profile plus the
// contact vault, since a concierge shortlist hands the contact over — the
// counterpart to the admin panel link for anything not surfaced here
const StaffCandidateProfile = ({ profile, email }: Props) => {
	const photoUrl =
		profile.photo && typeof profile.photo === "object"
			? (profile.photo.url ?? null)
			: null;

	// the shared map, so a verification state renders the same badge everywhere
	const verificationBadge = (profile.verificationState &&
		VERIFICATION_BADGE[profile.verificationState]) || {
		label: "Draft",
		variant: "outline" as const,
	};

	const ratingAverage = profile.ratingAverage ?? null;
	const ratingCount = profile.ratingCount ?? 0;

	const employmentEntries = [...(profile.employmentHistory ?? [])].sort((a, b) =>
		b.startDate.localeCompare(a.startDate),
	);

	const jobLabels = (profile.jobsSkills ?? []).map(
		(job) => JOB_OPTIONS.find((option) => option.value === job)?.label ?? job,
	);

	const languageLabels = (profile.languages ?? [])
		.map(
			(lang) => LANGUAGE_OPTIONS.find((option) => option.value === lang)?.label ?? lang,
		)
		.join(", ");

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
						<div className="flex items-start gap-4">
							<div className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-lg">
								{photoUrl ? (
									// eslint-disable-next-line @next/next/no-img-element -- profile photos live on s3/r2, not the image optimizer
									<img
										src={photoUrl}
										alt={`${profile.displayName} profile photo`}
										className="h-full w-full object-cover"
									/>
								) : (
									<div className="from-primary/10 to-primary/20 flex h-full w-full items-center justify-center bg-linear-to-br">
										<span className="text-heading/40 text-2xl font-semibold">
											{profile.displayName[0]?.toUpperCase() ?? "?"}
										</span>
									</div>
								)}
							</div>
							<div className="space-y-2">
								<CardTitle className="text-heading text-xl">
									{profile.displayName}
								</CardTitle>
								<div className="flex flex-wrap items-center gap-2">
									<Badge variant={verificationBadge.variant}>
										{verificationBadge.label}
									</Badge>
									<Badge variant="outline">
										{labelFor(
											[
												{ label: "Available", value: "available" },
												{ label: "Hired", value: "hired" },
												{ label: "On a Break", value: "on_break" },
											],
											profile.availabilityStatus,
										)}
									</Badge>
									{profile.suspended ? (
										<Badge variant="destructive">Suspended</Badge>
									) : null}
								</div>
								<CardDescription>
									Location: {labelFor(LOCATION_OPTIONS, profile.location)} ·{" "}
									{profile.yearsExperience ?? 0} yrs experience
								</CardDescription>
								{ratingCount > 0 && ratingAverage !== null ? (
									<div className="flex items-center gap-2">
										<RatingStars rating={ratingAverage} />
										<span className="text-muted-foreground text-xs">
											{ratingAverage.toFixed(1)} · {ratingCount}{" "}
											{ratingCount === 1 ? "review" : "reviews"}
										</span>
									</div>
								) : null}
							</div>
						</div>

						<div className="flex flex-col gap-2 sm:items-end">
							<Link
								href={`/dashboard/staff/verifications/${profile.id}`}
								className={buttonVariants({ variant: "outline", size: "sm" })}
							>
								<FileText className="size-4" />
								View documents
							</Link>
							<Link
								href={`/admin/collections/wajakazi-profiles/${profile.id}`}
								target="_blank"
								rel="noreferrer"
								className={buttonVariants({ variant: "ghost", size: "sm" })}
							>
								<ExternalLink className="size-4" />
								Open full record in admin
							</Link>
						</div>
					</div>
				</CardHeader>
			</Card>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-base">
							<UserCheck className="text-accent size-4" />
							Identity &amp; contact
						</CardTitle>
					</CardHeader>
					<CardContent className="grid gap-4 sm:grid-cols-2">
						<DetailRow
							label="Legal name"
							value={
								[profile.legalFirstName, profile.legalLastName]
									.filter(Boolean)
									.join(" ")
									.trim() || "Not set"
							}
						/>
						<DetailRow label="Date of birth" value={formatDate(profile.dateOfBirth)} />
						<DetailRow
							label="Nationality"
							value={labelFor(COUNTRY_OPTIONS, profile.nationality)}
						/>
						<DetailRow
							label="Marital status"
							value={labelFor(MARITAL_STATUS_OPTIONS, profile.maritalStatus)}
						/>
						<DetailRow
							label="Religion"
							value={labelFor(RELIGION_OPTIONS, profile.religion)}
						/>
						<DetailRow label="Phone" value={profile.phone || "Not set"} />
						<DetailRow label="Email" value={email ?? "Not set"} />
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Professional</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div>
							<p className="text-muted-foreground text-xs">Jobs / skills</p>
							{jobLabels.length > 0 ? (
								<div className="mt-1 flex flex-wrap gap-1.5">
									{jobLabels.map((label) => (
										<Badge key={label} variant="outline">
											{label}
										</Badge>
									))}
								</div>
							) : (
								<p className="text-foreground text-sm">Not set</p>
							)}
						</div>
						<div className="grid gap-4 sm:grid-cols-2">
							<DetailRow
								label="Education"
								value={labelFor(EDUCATION_LEVEL_OPTIONS, profile.educationLevel)}
							/>
							<DetailRow
								label="Work preference"
								value={labelFor(WORK_PREFERENCE_OPTIONS, profile.workPreference)}
							/>
							<DetailRow label="Languages" value={languageLabels || "Not set"} />
							<DetailRow
								label="Available from"
								value={formatDate(profile.availableFrom)}
							/>
							<DetailRow label="Expected salary" value={formatSalary(profile)} />
							<DetailRow
								label="Location"
								value={labelFor(LOCATION_OPTIONS, profile.location)}
							/>
						</div>
						<div>
							<p className="text-muted-foreground text-xs">About</p>
							<p className="text-foreground text-sm leading-relaxed wrap-break-word">
								{profile.about || "Not set"}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Employment history</CardTitle>
					<CardDescription>Self-reported, not verified.</CardDescription>
				</CardHeader>
				<CardContent>
					{employmentEntries.length === 0 ? (
						<p className="text-muted-foreground text-sm">No placements recorded.</p>
					) : (
						<ul className="flex flex-col gap-3">
							{employmentEntries.map((entry) => (
								<li
									key={entry.id ?? `${entry.employer}-${entry.startDate}`}
									className="border-border border-l-2 pl-3"
								>
									<p className="text-foreground text-sm font-medium wrap-break-word">
										{entry.employer}
									</p>
									<p className="text-muted-foreground text-xs">
										{labelFor(JOB_OPTIONS, entry.role)} · {formatDate(entry.startDate)} –{" "}
										{formatDate(entry.endDate)}
									</p>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-base">
						<ShieldCheck className="text-accent size-4" />
						Verification
					</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-3">
					<DetailRow label="State" value={verificationBadge.label} />
					<DetailRow
						label="Submitted"
						value={formatDate(profile.verificationSubmittedAt)}
					/>
					<DetailRow
						label="Reviewed"
						value={formatDate(profile.verificationReviewedAt)}
					/>
					<DetailRow label="Expires" value={formatDate(profile.verificationExpiry)} />
					<DetailRow label="Attempts" value={String(profile.verificationAttempts ?? 0)} />
					<DetailRow
						label="Profile complete"
						value={profile.profileComplete ? "Yes" : "No"}
					/>
					{profile.rejectionReason ? (
						<div className="sm:col-span-3">
							<p className="text-muted-foreground text-xs">Rejection reason</p>
							<p className="text-foreground text-sm wrap-break-word">
								{profile.rejectionReason}
							</p>
						</div>
					) : null}
				</CardContent>
			</Card>
		</div>
	);
};

export { StaffCandidateProfile };
