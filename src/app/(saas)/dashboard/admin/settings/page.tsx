import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { PlatformSettingsForm } from "@/components/dashboard/admin/settings/platform-settings-form";
import { SubscriptionTiersForm } from "@/components/dashboard/admin/settings/subscription-tiers-form";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";

export const metadata = { title: "Settings" };

const AdminSettingsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin") redirect(DASHBOARD_BY_ROLE[user.role]);

	const payload = await getPayload({ config });
	const settings = await payload.findGlobal({ slug: "platform-settings" });

	// pass existing tiers so the form pre-populates rather than starting blank
	const currentTiers = (settings.subscriptionTiers ?? []).map((tier) => ({
		tierId: tier.tierId ?? "",
		name: tier.name ?? "",
		price: tier.price ?? 0,
		durationDays: tier.durationDays ?? 30,
		description: tier.description ?? "",
		isActive: tier.isActive ?? true,
		isConcierge: tier.isConcierge ?? false,
	}));

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Settings</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Platform-wide pricing — the verification fee and the mwajiri subscription tiers.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<PlatformSettingsForm currentVerificationFee={settings.verificationFee} />
			</div>

			<SubscriptionTiersForm initialTiers={currentTiers} />
		</div>
	);
};

export { AdminSettingsPage as default };
