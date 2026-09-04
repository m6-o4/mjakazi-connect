import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { getPayload } from "payload";

import { Container } from "@/components/container";
import { WajakaziTeaserCard } from "@/components/web/wajakazi-teaser-card";
import { JOB_OPTIONS, LOCATION_OPTIONS } from "@/lib/profile-constants";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import config from "@/payload-config";
import type { WajakaziArchive } from "@/payload-types";

type WajakaziArchiveBlockProps = WajakaziArchive & { id?: string };

const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

// marketing block that showcases verified, available wajakazi as teaser cards.
// the filter mirrors DIRECTORY_VISIBLE — a profile is public only when verified
// AND available — so the homepage never leaks a profile that isn't live
const WajakaziArchiveBlock = async (props: WajakaziArchiveBlockProps) => {
	const {
		id,
		headline,
		headlineDescription,
		limit: limitFromProps,
		showViewAllLink = true,
		buttonLink,
		buttonText,
		backgroundVariant = "muted",
	} = props;

	const backgroundClass = bgMap[backgroundVariant] ?? "bg-primary/10";
	const limit = limitFromProps || 3;

	const payload = await getPayload({ config });

	const result = await payload.find({
		collection: "wajakazi-profiles",
		where: {
			and: [
				{ verificationState: { equals: "verified" } },
				{ availabilityStatus: { equals: "available" } },
			],
		},
		overrideAccess: true,
		depth: 1,
		limit,
		sort: "-updatedAt",
		select: {
			displayName: true,
			photo: true,
			jobsSkills: true,
			location: true,
			workPreference: true,
			yearsExperience: true,
		},
	});

	const profiles = result.docs;

	return (
		<div className={cn("px-4 py-20", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="px-3" id={`block-${id}`}>
					{(headline || headlineDescription) && (
						<div className="mb-12 flex flex-col items-end justify-between md:flex-row">
							<div>
								{headline ? (
									<h2 className="text-heading mb-4 text-3xl font-semibold md:text-4xl">
										{headline}
									</h2>
								) : null}
								{headlineDescription ? (
									<p className="text-muted-foreground">{headlineDescription}</p>
								) : null}
							</div>
							{showViewAllLink ? (
								<Link
									href="/directory"
									className={buttonVariants({
										variant: "outline",
										size: "lg",
										className:
											"border-primary/20 text-primary hover:bg-primary/10 hover:text-primary mt-6 hidden md:mt-0 md:inline-flex",
									})}
								>
									View all wajakazi <ArrowRight className="size-4" />
								</Link>
							) : null}
						</div>
					)}

					{profiles.length === 0 ? (
						<Card className="py-10">
							<CardContent className="flex flex-col items-center justify-center gap-3 text-center">
								<Users className="text-muted-foreground/40 size-10" />
								<p className="text-muted-foreground text-sm">
									No verified wajakazi available yet. Check back soon.
								</p>
							</CardContent>
						</Card>
					) : (
						<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
							{profiles.map((profile) => {
								const firstName = (profile.displayName ?? "").split(" ")[0];

								const photoUrl =
									profile.photo && typeof profile.photo === "object"
										? (profile.photo.url ?? null)
										: null;

								const jobLabels = Array.isArray(profile.jobsSkills)
									? profile.jobsSkills
											.map(
												(job) =>
													JOB_OPTIONS.find((option) => option.value === job)
														?.label ?? job,
											)
											.slice(0, 3)
									: [];

								const locationLabel =
									LOCATION_OPTIONS.find(
										(option) => option.value === profile.location,
									)?.label ?? profile.location ?? null;

								return (
									<WajakaziTeaserCard
										key={profile.id}
										firstName={firstName}
										photoUrl={photoUrl}
										jobLabels={jobLabels}
										locationLabel={locationLabel}
										yearsExperience={profile.yearsExperience ?? null}
										workPreference={profile.workPreference ?? null}
										buttonLink={buttonLink ?? "/sign-up?role=mwajiri"}
										buttonText={buttonText ?? "View Profile"}
									/>
								);
							})}
						</div>
					)}

					{showViewAllLink && profiles.length > 0 ? (
						<div className="mt-10 flex justify-center md:hidden">
							<Link
								href="/directory"
								className={buttonVariants({
									variant: "outline",
									size: "lg",
									className:
										"border-primary/20 text-primary hover:bg-primary/10 hover:text-primary",
								})}
							>
								View all wajakazi <ArrowRight className="size-4" />
							</Link>
						</div>
					) : null}
				</div>
			</Container>
		</div>
	);
};

export { WajakaziArchiveBlock };
