import { Container } from "@/components/container";
import { WajakaziTeaserCard } from "@/components/web/wajakazi-teaser-card";
import { JOB_OPTIONS, LOCATION_OPTIONS } from "@/lib/profile-constants";
import { cn } from "@/lib/utils";
import type { WajakaziArchive } from "@/payload-types";
import config from "@payload-config";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { getPayload } from "payload";

// map background variants to class names
const bgMap: Record<string, string> = { subtle: "bg-bg-subtle", white: "bg-bg-white" };

const WajakaziArchiveBlock = async ({
	backgroundVariant = "subtle",
	headline,
	headlineDescription,
	showViewAllLink = true,
	buttonLink,
	buttonText,
	id,
}: WajakaziArchive & { id?: string }) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-bg-subtle";

	const payload = await getPayload({ config });

	// fetch only verified and complete profiles
	const result = await payload.find({
		collection: "wajakaziprofiles",
		where: {
			and: [
				{ verificationStatus: { equals: "verified" } },
				{ profileComplete: { equals: true } },
			],
		},
		overrideAccess: true,
		depth: 1,
		sort: "-updatedAt",
		select: {
			displayName: true,
			photo: true,
			jobs: true,
			location: true,
			workPreference: true,
			experience: true,
		},
	});

	const profiles = result.docs;

	// render archive layout with responsive grid
	return (
		<div className={cn("px-4 py-20", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="px-3" id={`block-${id}`}>
					{/* render header if content is provided */}
					{(headline || headlineDescription) && (
						<div className="mb-12 flex flex-col items-end justify-between md:flex-row">
							<div>
								{headline && (
									<h2 className="font-display text-text-default mb-4 text-3xl font-bold md:text-4xl">
										{headline}
									</h2>
								)}
								{headlineDescription && (
									<p className="text-muted-foreground">{headlineDescription}</p>
								)}
							</div>
							{showViewAllLink && (
								<Link
									href="/directory"
									className="border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10 mt-6 hidden items-center justify-center rounded-lg border px-6 py-3 font-medium transition-all duration-200 md:mt-0 md:inline-flex"
								>
									View All Wajakazi <ArrowRight className="ml-2 size-4" />
								</Link>
							)}
						</div>
					)}
					{/* render fallback if no profiles found */}
					{profiles.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-16 text-center">
							<p className="text-muted-foreground text-sm">
								No verified profiles available yet. Check back soon.
							</p>
						</div>
					) : (
						// map profiles to teaser cards
						<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
							{profiles.map((profile) => {
								const firstName = (profile.displayName ?? "").split(" ")[0];

								const photoUrl =
									profile.photo &&
									typeof profile.photo === "object" &&
									"url" in profile.photo
										? (profile.photo as any).url
										: null;

								const jobLabels = Array.isArray(profile.jobs)
									? profile.jobs
											.map((j) => JOB_OPTIONS.find((o) => o.value === j)?.label ?? j)
											.slice(0, 3)
									: [];

								const locationLabel =
									LOCATION_OPTIONS.find((l) => l.value === profile.location)?.label ??
									profile.location ??
									null;

								return (
									<WajakaziTeaserCard
										key={profile.id}
										firstName={firstName}
										photoUrl={photoUrl}
										jobLabels={jobLabels}
										locationLabel={locationLabel}
										experience={profile.experience ?? null}
										workPreference={profile.workPreference ?? null}
										buttonLink={buttonLink}
										buttonText={buttonText}
									/>
								);
							})}
						</div>
					)}
					{/* // render call to action link */}
					{showViewAllLink && profiles.length > 0 && (
						<div className="mt-10 flex justify-center md:hidden">
							<Link
								href="/directory"
								className="border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10 inline-flex items-center justify-center rounded-lg border px-6 py-3 font-medium transition-all duration-200"
							>
								View All Wajakazi <ArrowRight className="ml-2 size-4" />
							</Link>
						</div>
					)}
				</div>
			</Container>
		</div>
	);
};

export { WajakaziArchiveBlock };
