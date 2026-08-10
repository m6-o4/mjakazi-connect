import { WorkerProfile } from "@/components/dashboard/mwajiri/worker-profile";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { JOB_OPTIONS, LANGUAGE_OPTIONS, LOCATION_OPTIONS } from "@/lib/profile-constants";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Worker Profile" };
export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

// server-side page for displaying a worker's detailed profile to a verified, subscribed employer
const Page = async ({ params }: Props) => {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// ensure only employers can access this route
	if (!identity || identity.role !== "mwajiri") redirect("/sign-in");

	// verify subscription status before exposing any profile data
	const profileResult = await payload.find({
		collection: "waajiriprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const mwajiriProfile = profileResult.docs[0] ?? null;
	const isSubscribed = mwajiriProfile?.subscriptionStatus === "active";

	// redirect non-subscribed employers to the subscription page
	if (!isSubscribed) redirect("/dashboard/mwajiri/subscription");

	const { id } = await params;

	// fetch worker profile by id; handle potential retrieval errors
	let profile: any = null;

	try {
		profile = await payload.findByID({
			collection: "wajakaziprofiles",
			id,
			overrideAccess: true,
			depth: 1,
		});
	} catch {
		notFound();
	}

	if (!profile) notFound();

	// only display complete and verified worker profiles
	if (profile.verificationStatus !== "verified" || !profile.profileComplete) {
		notFound();
	}

	// check if this mwajiri has already sent an eoi to this worker
	const existingEoi = await payload.find({
		collection: "expressions-of-interest",
		where: {
			and: [
				{ mwajiriAccount: { equals: identity.accountId } },
				{ wajakaziProfile: { equals: id } },
			],
		},
		overrideAccess: true,
		limit: 1,
	});

	const hasExistingEoi = existingEoi.totalDocs > 0;

	// map raw data to display-ready formats and labels
	const photoUrl =
		profile.photo && typeof profile.photo === "object" && "url" in profile.photo
			? (profile.photo as any).url
			: null;

	const jobLabels = Array.isArray(profile.jobs)
		? profile.jobs.map((j: string) => {
				const opt = JOB_OPTIONS.find((o) => o.value === j);
				return opt ? { label: opt.label, icon: opt.icon } : { label: j, icon: "" };
			})
		: [];

	const locationLabel =
		LOCATION_OPTIONS.find((l) => l.value === profile.location)?.label ??
		profile.location ??
		null;

	const languageLabels = Array.isArray(profile.languages)
		? (profile.languages as string[]).map(
				(l) => LANGUAGE_OPTIONS.find((o) => o.value === l)?.label ?? l,
			)
		: [];

	const salaryDisplay =
		profile.salaryMin !== null && profile.salaryMax !== null
			? `KSh ${profile.salaryMin?.toLocaleString()} – ${profile.salaryMax?.toLocaleString()} / month`
			: profile.salaryMin !== null
				? `From KSh ${profile.salaryMin?.toLocaleString()} / month`
				: profile.salaryMax !== null
					? `Up to KSh ${profile.salaryMax?.toLocaleString()} / month`
					: null;

	return (
		<>
			<DashboardTopbar title="Worker Profile" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<WorkerProfile
					profileId={id}
					displayName={profile.displayName ?? ""}
					photoUrl={photoUrl}
					bio={profile.bio ?? null}
					jobLabels={jobLabels}
					locationLabel={locationLabel}
					experience={profile.experience ?? null}
					workPreference={profile.workPreference ?? null}
					languages={languageLabels}
					salaryDisplay={salaryDisplay}
					educationLevel={profile.educationLevel ?? null}
					availabilityStatus={profile.availabilityStatus ?? "available"}
					hasExistingEoi={hasExistingEoi}
				/>
			</main>
		</>
	);
};

export { Page as default };
