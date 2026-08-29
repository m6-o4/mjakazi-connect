import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { ProfileCompletenessCard } from "@/components/dashboard/mjakazi/profile-completeness-card";
import config from "@/payload-config";
import {
	PROFILE_REQUIRED_FIELDS,
	PROFILE_REQUIRED_LABELS,
} from "@/lib/profile-constants";
import { getMissingRequiredFields, getOwnProfile } from "@/services/profile.service";

export const metadata = { title: "Dashboard" };

const MjakaziDashboardPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const profile = await getOwnProfile(payload, user);

	const profileComplete = profile?.profileComplete ?? false;
	const missingFields = profile ? new Set(getMissingRequiredFields(profile)) : new Set();

	const checklistItems = PROFILE_REQUIRED_FIELDS.map((field) => ({
		label: PROFILE_REQUIRED_LABELS[field],
		complete: !missingFields.has(field),
		href: "/dashboard/mjakazi/profile",
	}));

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">
					Welcome{profile?.displayName ? `, ${profile.displayName}` : ""}
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Here is your profile status.
				</p>
			</div>

			{profileComplete ? (
				<p className="text-muted-foreground text-sm">
					Your profile is complete. The next step is verifying your documents, which
					arrives in a later phase.
				</p>
			) : (
				<ProfileCompletenessCard items={checklistItems} />
			)}
		</div>
	);
};

export { MjakaziDashboardPage as default };
