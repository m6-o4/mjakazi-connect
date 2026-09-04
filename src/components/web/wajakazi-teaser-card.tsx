import { ArrowRight, BadgeCheck, Briefcase, Calendar, MapPin } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { WORK_PREFERENCE_OPTIONS } from "@/lib/profile-constants";

type WajakaziTeaserCardProps = {
	firstName: string;
	photoUrl: string | null;
	jobLabels: string[];
	locationLabel: string | null;
	yearsExperience: number | null;
	workPreference: string | null;
	buttonLink: string;
	buttonText: string;
};

// a single verified wajakazi teaser on the marketing site, formatted to match
// the posts-archive cards (same image aspect, hover zoom and card spacing).
// deliberately omits contact details — those stay protected until an employer
// expresses interest
const WajakaziTeaserCard = ({
	firstName,
	photoUrl,
	jobLabels,
	locationLabel,
	yearsExperience,
	workPreference,
	buttonLink,
	buttonText,
}: WajakaziTeaserCardProps) => {
	const preferenceLabel =
		WORK_PREFERENCE_OPTIONS.find((o) => o.value === workPreference)?.label ?? null;

	return (
		<Card className="group h-full gap-0 py-0 transition-all duration-300 hover:shadow-lg">
			<div className="bg-muted relative aspect-16/10 overflow-hidden">
				{photoUrl ? (
					<>
						{/* eslint-disable-next-line @next/next/no-img-element -- profile photos live on s3/r2, not the image optimizer */}
						<img
							src={photoUrl}
							alt={`${firstName}'s profile`}
							className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
						/>
						<div className="bg-primary/10 absolute inset-0 transition-colors duration-300 group-hover:bg-transparent" />
					</>
				) : (
					<>
						<div className="bg-primary/10 absolute inset-0 transition-colors duration-300 group-hover:bg-transparent" />
						<div className="from-primary/10 to-primary/20 flex h-full w-full items-center justify-center bg-linear-to-br">
							<span className="text-heading/40 text-4xl font-semibold transition-transform duration-500 group-hover:scale-110">
								{firstName[0]?.toUpperCase() ?? "?"}
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
					{firstName}
				</h3>

				<div className="text-muted-foreground flex flex-col gap-1 text-sm">
					{preferenceLabel ? (
						<span className="flex items-center gap-1.5">
							<Briefcase className="size-3.5 shrink-0" />
							{preferenceLabel}
						</span>
					) : null}
					{locationLabel ? (
						<span className="flex items-center gap-1.5">
							<MapPin className="size-3.5 shrink-0" />
							{locationLabel}
						</span>
					) : null}
					{yearsExperience !== null && yearsExperience !== undefined ? (
						<span className="flex items-center gap-1.5">
							<Calendar className="size-3.5 shrink-0" />
							{yearsExperience === 1 ? "1 year" : `${yearsExperience} years`} experience
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

				<div className="mt-auto flex flex-col gap-2 pt-2">
					<Link
						href={buttonLink}
						className={buttonVariants({
							className:
								"bg-accent text-accent-foreground hover:bg-accent/90 w-full font-semibold",
						})}
					>
						{buttonText}
						<ArrowRight className="size-4" />
					</Link>
					<p className="text-muted-foreground text-center text-xs">
						Already a mwajiri?{" "}
						<Link href="/sign-in" className="text-primary font-medium hover:underline">
							Sign in
						</Link>
					</p>
				</div>
			</CardContent>
		</Card>
	);
};

export { WajakaziTeaserCard };
