import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { PurchaseSubscription } from "@/components/dashboard/mwajiri/subscription/purchase-subscription";
import config from "@/payload-config";
import { getOwnWaajiriProfile } from "@/services/profile.service";
import { getSubscriptionTiers } from "@/services/settings.service";
import { getOwnSubscription } from "@/services/subscription.service";

export const metadata: Metadata = { title: "Subscription" };

const MwajiriSubscriptionPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });

	const [subscription, tiers, profile] = await Promise.all([
		getOwnSubscription(payload, user),
		getSubscriptionTiers(payload),
		getOwnWaajiriProfile(payload, user),
	]);

	const tierOptions = tiers.map((tier) => ({
		tierId: tier.tierId,
		name: tier.name,
		price: tier.price,
		durationDays: tier.durationDays,
		description: tier.description ?? null,
		isConcierge: tier.isConcierge === true,
	}));

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Subscription</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Choose a plan to unlock the contact details of verified wajakazi.
				</p>
			</div>

			<PurchaseSubscription
				tiers={tierOptions}
				state={subscription?.subscriptionState ?? "none"}
				expiry={subscription?.tierExpiry ?? null}
				phone={profile?.phone ?? null}
			/>
		</div>
	);
};

export { MwajiriSubscriptionPage as default };
