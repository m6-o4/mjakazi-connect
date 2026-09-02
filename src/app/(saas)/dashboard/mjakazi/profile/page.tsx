import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { ProfileForm } from "@/components/dashboard/mjakazi/profile-form";
import type { ProfileFormValues } from "@/lib/profile-schema";
import config from "@/payload-config";
import type { ProfilePhoto } from "@/payload-types";
import { getOwnProfile } from "@/services/profile.service";

export const metadata: Metadata = { title: "Profile" };

// payload stores dates as ISO strings; a date input needs YYYY-MM-DD
const toDateInputValue = (value: string | Date | null | undefined): string => {
	if (!value) return "";
	if (value instanceof Date) return value.toISOString().slice(0, 10);
	return value.slice(0, 10);
};

const toPhotoInfo = (
	photo: WajakaziProfilePhoto,
): { id: string; url: string | null } | null => {
	if (!photo) return null;
	if (typeof photo === "string") return { id: photo, url: null };
	return { id: photo.id, url: photo.url ?? null };
};

type WajakaziProfilePhoto = ProfilePhoto | string | null | undefined;

const MjakaziProfilePage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const profile = await getOwnProfile(payload, user);
	if (!profile) redirect("/dashboard/mjakazi");

	const initialValues: ProfileFormValues = {
		displayName: profile.displayName,
		legalFirstName: profile.legalFirstName ?? "",
		legalLastName: profile.legalLastName ?? "",
		dateOfBirth: toDateInputValue(profile.dateOfBirth),
		nationality: profile.nationality ?? "",
		maritalStatus: profile.maritalStatus ?? "",
		religion: profile.religion ?? "",
		phone: profile.phone ?? "",
		jobsSkills: profile.jobsSkills ?? [],
		about: profile.about ?? "",
		yearsExperience: profile.yearsExperience ?? undefined,
		educationLevel: profile.educationLevel ?? "",
		languages: profile.languages ?? [],
		workPreference: profile.workPreference ?? "",
		availableFrom: toDateInputValue(profile.availableFrom),
		salaryMin: profile.salaryMin ?? undefined,
		salaryMax: profile.salaryMax ?? undefined,
		location: profile.location ?? "",
	};

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">My Profile</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					This is what employers see when they find you.
				</p>
			</div>

			<ProfileForm
				initialValues={initialValues}
				photo={toPhotoInfo(profile.photo)}
				initialProfileComplete={profile.profileComplete ?? false}
			/>
		</div>
	);
};

export { MjakaziProfilePage as default };
