import { PaywallOverlay } from "@/components/dashboard/mwajiri/paywall-overlay";
import { WorkerCard } from "@/components/dashboard/mwajiri/worker-card";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { JOB_OPTIONS, LOCATION_OPTIONS } from "@/lib/profile-constants";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Browse Wajakazi" };
export const dynamic = "force-dynamic";

type Props = {
	searchParams: Promise<{ location?: string; job?: string; page?: string }>;
};

const WORKERS_PER_PAGE = 12;
const PAYWALL_PREVIEW_COUNT = 3;

const Page = async ({ searchParams }: Props) => {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity || identity.role !== "mwajiri") redirect("/sign-in");

	// fetch mwajiri profile to check live subscription status
	const profileResult = await payload.find({
		collection: "waajiriprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const mwajiriProfile = profileResult.docs[0] ?? null;
	const isSubscribed = mwajiriProfile?.subscriptionStatus === "active";

	const { location, job, page: pageParam } = await searchParams;
	const currentPage = Math.max(1, parseInt(pageParam ?? "1", 10));

	// base filters applied to all queries regardless of subscription status
	const baseFilters: any[] = [
		{ verificationStatus: { equals: "verified" } },
		{ profileComplete: { equals: true } },
		{ availabilityStatus: { equals: "available" } },
	];

	// location and job filters only apply for subscribed users
	const filters: any[] = isSubscribed
		? [
				...baseFilters,
				...(location ? [{ location: { equals: location } }] : []),
				...(job ? [{ jobs: { contains: job } }] : []),
			]
		: baseFilters;

	const result = await payload.find({
		collection: "wajakaziprofiles",
		where: { and: filters },
		overrideAccess: true,
		depth: 1,
		limit: isSubscribed ? WORKERS_PER_PAGE : PAYWALL_PREVIEW_COUNT,
		page: isSubscribed ? currentPage : 1,
		sort: "-updatedAt",
	});

	const profiles = result.docs;
	const totalPages = result.totalPages;
	const totalVerified = result.totalDocs;

	// build pagination urls preserving existing filters
	const buildUrl = (p: number) => {
		const params = new URLSearchParams();
		if (location) params.set("location", location);
		if (job) params.set("job", job);
		params.set("page", String(p));
		return `/dashboard/mwajiri/browse?${params.toString()}`;
	};

	return (
		<>
			<DashboardTopbar title="Browse Wajakazi" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				{/* filters — only shown to subscribed users */}
				{isSubscribed && (
					<div className="flex flex-wrap gap-3">
						<form
							method="GET"
							action="/dashboard/mwajiri/browse"
							className="flex flex-wrap gap-3"
						>
							<select
								name="location"
								defaultValue={location ?? ""}
								className="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
							>
								<option value="">All Locations</option>
								{LOCATION_OPTIONS.map((l) => (
									<option key={l.value} value={l.value}>
										{l.label}
									</option>
								))}
							</select>

							<select
								name="job"
								defaultValue={job ?? ""}
								className="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:outline-none"
							>
								<option value="">All Skills</option>
								{JOB_OPTIONS.map((j) => (
									<option key={j.value} value={j.value}>
										{j.icon} {j.label}
									</option>
								))}
							</select>

							<button
								type="submit"
								className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
							>
								Filter
							</button>

							{(location || job) && (
								<a
									href="/dashboard/mwajiri/browse"
									className="border-input text-muted-foreground hover:text-foreground rounded-lg border px-4 py-2 text-sm transition-colors"
								>
									Clear
								</a>
							)}
						</form>
					</div>
				)}

				{/* results count — only shown to subscribed users */}
				{isSubscribed && (
					<p className="text-muted-foreground text-sm">
						{result.totalDocs === 0
							? "No workers found matching your filters."
							: `${result.totalDocs} verified worker${result.totalDocs !== 1 ? "s" : ""} found`}
					</p>
				)}

				{/* worker grid */}
				<div className="relative">
					<div
						className={[
							"grid gap-6 sm:grid-cols-2 lg:grid-cols-3",
							!isSubscribed ? "pointer-events-none select-none" : "",
						].join(" ")}
					>
						{profiles.map((profile) => {
							const photoUrl =
								profile.photo &&
								typeof profile.photo === "object" &&
								"url" in profile.photo
									? (profile.photo as any).url
									: null;

							const jobLabels = Array.isArray(profile.jobs)
								? profile.jobs.map((j) => {
										const opt = JOB_OPTIONS.find((o) => o.value === j);
										return opt
											? { label: opt.label, icon: opt.icon }
											: { label: j, icon: "" };
									})
								: [];

							const locationLabel =
								LOCATION_OPTIONS.find((l) => l.value === profile.location)?.label ??
								profile.location ??
								null;

							const languageLabels = Array.isArray(profile.languages)
								? (profile.languages as string[])
								: [];

							return (
								<div key={profile.id} className={!isSubscribed ? "blur-sm" : ""}>
									<WorkerCard
										id={profile.id}
										displayName={profile.displayName ?? ""}
										photoUrl={photoUrl}
										jobLabels={jobLabels}
										locationLabel={locationLabel}
										experience={profile.experience ?? null}
										workPreference={profile.workPreference ?? null}
										languages={languageLabels}
										salaryMin={profile.salaryMin ?? null}
										salaryMax={profile.salaryMax ?? null}
										educationLevel={profile.educationLevel ?? null}
									/>
								</div>
							);
						})}
					</div>

					{/* paywall overlay — rendered over the blurred grid */}
					{!isSubscribed && <PaywallOverlay verifiedCount={totalVerified} />}
				</div>

				{/* pagination — subscribed users only */}
				{isSubscribed && totalPages > 1 && (
					<div className="flex items-center justify-center gap-3 pt-4">
						{currentPage > 1 && (
							<a
								href={buildUrl(currentPage - 1)}
								className="border-input text-muted-foreground hover:text-foreground rounded-lg border px-4 py-2 text-sm transition-colors"
							>
								Previous
							</a>
						)}
						<span className="text-muted-foreground text-sm">
							Page {currentPage} of {totalPages}
						</span>
						{currentPage < totalPages && (
							<a
								href={buildUrl(currentPage + 1)}
								className="border-input text-muted-foreground hover:text-foreground rounded-lg border px-4 py-2 text-sm transition-colors"
							>
								Next
							</a>
						)}
					</div>
				)}
			</main>
		</>
	);
};

export { Page as default };
