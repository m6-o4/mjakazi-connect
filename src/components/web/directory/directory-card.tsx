import { ArrowRight, BadgeCheck, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { JOB_OPTIONS, LOCATION_OPTIONS } from "@/lib/profile-constants";
import type { DirectoryProfile } from "@/services/directory.service";

type DirectoryCardProps = {
	profile: DirectoryProfile;
	basePath?: string;
};

// a single wajakazi in the directory. links to the profile's own detail page and
// deliberately renders no contact fields. `basePath` lets the authenticated
// mwajiri browse reuse the card against its own route without touching the
// public directory
const DirectoryCard = ({ profile, basePath = "/directory" }: DirectoryCardProps) => {
	const name = profile.displayName ?? "";
	const href = `${basePath}/${profile.slug ?? ""}`;

	const photoUrl =
		profile.photo && typeof profile.photo === "object"
			? (profile.photo.url ?? null)
			: null;

	const jobLabels = Array.isArray(profile.jobsSkills)
		? profile.jobsSkills
				.map((job) => JOB_OPTIONS.find((option) => option.value === job)?.label ?? job)
				.slice(0, 3)
		: [];

	const locationLabel =
		LOCATION_OPTIONS.find((option) => option.value === profile.location)?.label ??
		profile.location ??
		null;

	return (
		<Card className="group h-full gap-0 py-0 transition-all duration-300 hover:shadow-lg">
			<div className="bg-muted relative aspect-16/10 overflow-hidden">
				{photoUrl ? (
					<>
						{/* eslint-disable-next-line @next/next/no-img-element -- profile photos live on s3/r2, not the image optimizer */}
						<img
							src={photoUrl}
							alt={`${name}'s profile`}
							className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
						<div className="bg-primary/10 absolute inset-0 transition-colors duration-300 group-hover:bg-transparent" />
					</>
				) : (
					<>
						<div className="bg-primary/10 absolute inset-0 transition-colors duration-300 group-hover:bg-transparent" />
						<div className="from-primary/10 to-primary/20 flex h-full w-full items-center justify-center bg-linear-to-br">
							<span className="text-heading/40 text-4xl font-semibold transition-transform duration-500 group-hover:scale-110">
								{name[0]?.toUpperCase() ?? "?"}
							</span>
						</div>
					</>
				)}
				<div className="absolute top-4 left-4">
					<span className="border-border bg-card text-success inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium">
						<BadgeCheck className="size-3" />
						Verified
					</span>
				</div>
			</div>

			<CardContent className="flex flex-1 flex-col gap-3 px-6 py-6">
				<h3 className="text-heading group-hover:text-primary text-xl font-semibold transition-colors">
					{name}
				</h3>

				<div className="text-muted-foreground flex flex-col gap-1 text-sm">
					{locationLabel ? (
						<span className="flex items-center gap-1.5">
							<MapPin className="size-3.5 shrink-0" />
							{locationLabel}
						</span>
					) : null}
					{profile.yearsExperience !== null && profile.yearsExperience !== undefined ? (
						<span className="flex items-center gap-1.5">
							<Calendar className="size-3.5 shrink-0" />
							{profile.yearsExperience === 1
								? "1 year"
								: `${profile.yearsExperience} years`}{" "}
							experience
						</span>
					) : null}
				</div>

				{jobLabels.length > 0 ? (
					<div className="flex flex-wrap gap-1.5">
						{jobLabels.map((label) => (
							<Badge key={label} variant="outline" className="text-muted-foreground">
								{label}
							</Badge>
						))}
					</div>
				) : null}

				<div className="mt-auto pt-2">
					<Link
						href={href}
						className={buttonVariants({
							className:
								"bg-accent text-accent-foreground hover:bg-accent/90 w-full font-semibold",
						})}
					>
						View Profile
						<ArrowRight className="size-4" />
					</Link>
				</div>
			</CardContent>
		</Card>
	);
};

export { DirectoryCard };
