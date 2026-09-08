import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { AvailabilityCard } from "@/components/dashboard/settings/availability-card";
import { DeleteAccountCard } from "@/components/dashboard/settings/delete-account-card";
import config from "@/payload-config";
import { listHireCandidatesForMjakazi } from "@/services/hire.service";
import { getOwnProfile } from "@/services/profile.service";

export const metadata: Metadata = { title: "Settings" };

const MjakaziSettingsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "mjakazi") redirect(`/dashboard/${user.role}`);

	const payload = await getPayload({ config });
	const profile = await getOwnProfile(payload, user);
	const hireCandidates = await listHireCandidatesForMjakazi(payload, user, profile?.id);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Settings</h1>
				<p className="text-muted-foreground mt-1 text-sm">Manage your account.</p>
			</div>

			{profile ? (
				<AvailabilityCard
					currentStatus={profile.availabilityStatus}
					hireCandidates={hireCandidates}
				/>
			) : null}

			<DeleteAccountCard role="mjakazi" />
		</div>
	);
};

export { MjakaziSettingsPage as default };
