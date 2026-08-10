import { PlatformSettingsForm } from "@/components/dashboard/sa/platform-settings-form";
import { SubscriptionTiersForm } from "@/components/dashboard/sa/subscription-tiers-form";
import { NameUpdateForm } from "@/components/dashboard/settings/name-update-form";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth, currentUser } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Settings" };

const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity || identity.role !== "sa") redirect("/sign-in");

	const clerkUser = await currentUser();

	const platformSettings = await payload.findGlobal({
		slug: "platform-settings",
		overrideAccess: true,
	});

	const currentRegistrationFee = platformSettings?.registrationFee ?? 1500;

	// pass existing tiers so the form pre-populates rather than starting blank
	const currentTiers = (platformSettings?.subscriptionTiers ?? []).map((tier: any) => ({
		tierId: tier.tierId ?? "",
		name: tier.name ?? "",
		price: tier.price ?? 0,
		durationDays: tier.durationDays ?? 30,
		description: tier.description ?? "",
		isActive: tier.isActive ?? true,
	}));

	return (
		<>
			<DashboardTopbar title="Settings" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid gap-6 md:grid-cols-2">
					<NameUpdateForm
						currentFirstName={clerkUser?.firstName ?? ""}
						currentLastName={clerkUser?.lastName ?? ""}
					/>
					<PlatformSettingsForm currentRegistrationFee={currentRegistrationFee} />
				</div>
				{/* tiers span full width — each tier card needs horizontal space */}
				<SubscriptionTiersForm initialTiers={currentTiers} />
			</main>
		</>
	);
};

export { Page as default };
