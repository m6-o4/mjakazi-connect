import { SubscriptionFlow } from "@/components/dashboard/mwajiri/subscription-flow";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Subscription" };

const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity || identity.role !== "mwajiri") redirect("/sign-in");

	// read active tiers from platform settings — filter inactive so the mwajiri
	// only sees plans the sa has enabled
	const platformSettings = await payload.findGlobal({
		slug: "platform-settings",
		overrideAccess: true,
	});

	const activeTiers = ((platformSettings?.subscriptionTiers as any[]) ?? [])
		.filter((t) => t.isActive)
		.map((t) => ({
			tierId: t.tierId,
			name: t.name,
			price: t.price,
			durationDays: t.durationDays,
			description: t.description ?? null,
			isActive: t.isActive,
		}));

	// fetch the mwajiri profile for current subscription state
	const profileResult = await payload.find({
		collection: "waajiriprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const profile = profileResult.docs[0] ?? null;
	const subscriptionStatus = profile?.subscriptionStatus ?? "none";
	const subscriptionEndDate = profile?.subscriptionEndDate ?? null;
	const subscriptionTierName = profile?.subscriptionTierName ?? null;

	return (
		<>
			<DashboardTopbar title="Subscription" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
					<SubscriptionFlow
						tiers={activeTiers}
						subscriptionStatus={subscriptionStatus as string}
						subscriptionEndDate={subscriptionEndDate as string | null}
						subscriptionTierName={subscriptionTierName as string | null}
					/>
				</div>
			</main>
		</>
	);
};

export { Page as default };
