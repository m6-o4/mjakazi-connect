import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { PurchaseSubscription } from "@/components/dashboard/mwajiri/subscription/purchase-subscription";
import { formatKenyanPhone } from "@/lib/phone";
import config from "@/payload-config";
import { getLatestPaymentForUser } from "@/services/payment.service";
import { getOwnWaajiriProfile } from "@/services/profile.service";
import { getSubscriptionTiers } from "@/services/settings.service";
import { getOwnSubscription } from "@/services/subscription.service";

export const metadata: Metadata = { title: "Subscription" };

const MwajiriSubscriptionPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });

	const [subscription, tiers, profile, latestPayment] = await Promise.all([
		getOwnSubscription(payload, user),
		getSubscriptionTiers(payload),
		getOwnWaajiriProfile(payload, user),
		getLatestPaymentForUser(payload, user.id, "subscription"),
	]);

	// the service resolves each tier's rank (stored value, or position for a row
	// saved before `rank` existed), so the list orders and upgrade detection has a
	// concrete rank without a per-page fallback
	const tierOptions = tiers
		.map((tier) => ({
			tierId: tier.tierId,
			name: tier.name,
			rank: tier.rank,
			price: tier.price,
			durationDays: tier.durationDays,
			description: tier.description ?? null,
			isConcierge: tier.isConcierge === true,
		}))
		.sort((a, b) => a.rank - b.rank);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Subscription</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Choose a plan to browse verified wajakazi and send them an expression of
					interest.
				</p>
			</div>

			<PurchaseSubscription
				tiers={tierOptions}
				state={subscription?.subscriptionState ?? "none"}
				expiry={subscription?.tierExpiry ?? null}
				currentTierId={subscription?.tierId ?? null}
				phone={profile?.phone ? formatKenyanPhone(profile.phone) : null}
				latestPaymentId={latestPayment?.id ?? null}
				latestPaymentStatus={latestPayment?.status ?? null}
			/>
		</div>
	);
};

export { MwajiriSubscriptionPage as default };
