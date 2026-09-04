import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { DeleteAccountCard } from "@/components/dashboard/settings/delete-account-card";

export const metadata: Metadata = { title: "Settings" };

const MwajiriSettingsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "mwajiri") redirect(`/dashboard/${user.role}`);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Settings</h1>
				<p className="text-muted-foreground mt-1 text-sm">Manage your account.</p>
			</div>

			<DeleteAccountCard role="mwajiri" />
		</div>
	);
};

export { MwajiriSettingsPage as default };
