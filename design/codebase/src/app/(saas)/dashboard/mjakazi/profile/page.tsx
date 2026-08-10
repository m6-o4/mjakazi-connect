import { ProfileForm } from "@/components/dashboard/mjakazi/profile-form";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Profile" };

const Page = async () => {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity || identity.role !== "mjakazi") redirect("/sign-in");

	const profileQuery = await payload.find({
		collection: "wajakaziprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		depth: 1,
		limit: 1,
	});

	const profile = profileQuery.docs[0] ?? null;

	const photoUrl =
		profile?.photo && typeof profile.photo === "object" && "url" in profile.photo
			? (profile.photo as any).url
			: null;

	const photoId =
		profile?.photo && typeof profile.photo === "object" && "id" in profile.photo
			? (profile.photo as any).id
			: null;

	return (
		<>
			<DashboardTopbar title="My Profile" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid gap-6 md:grid-cols-2">
					<ProfileForm
						currentDisplayName={profile?.displayName ?? ""}
						currentPhotoUrl={photoUrl}
						currentPhotoId={photoId}
						currentBio={profile?.bio ?? ""}
						currentJobs={(profile?.jobs as string[]) ?? []}
						currentExperience={profile?.experience ?? null}
						currentEducationLevel={profile?.educationLevel ?? ""}
						currentLanguages={(profile?.languages as string[]) ?? []}
						currentWorkPreference={profile?.workPreference ?? ""}
						currentAvailableFrom={profile?.availableFrom ?? ""}
						currentSalaryMin={profile?.salaryMin ?? null}
						currentSalaryMax={profile?.salaryMax ?? null}
						currentLocation={profile?.location ?? ""}
						currentNationality={profile?.nationality ?? ""}
						currentDateOfBirth={profile?.dateOfBirth ?? ""}
						currentMaritalStatus={profile?.maritalStatus ?? ""}
						currentReligion={profile?.religion ?? ""}
						currentPhoneNumber={profile?.phoneNumber ?? ""}
					/>
				</div>
			</main>
		</>
	);
};

export { Page as default };
