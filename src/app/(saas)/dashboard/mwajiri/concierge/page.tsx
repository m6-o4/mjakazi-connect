import { redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload-config";
import { getCurrentUser } from "@/components/admin/get-current-user";
import { ConciergeBriefForm } from "@/components/dashboard/mwajiri/concierge/concierge-brief-form";
import { ConciergeStatusCard } from "@/components/dashboard/mwajiri/concierge/concierge-status-card";
import type { BriefInput } from "@/services/concierge.service";
import { getConciergeCaseForMwajiri } from "@/services/concierge.service";
import { getOwnSubscription } from "@/services/subscription.service";

export const dynamic = "force-dynamic";

const Page = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "mwajiri") redirect(`/dashboard/${user.role}`);

	const payload = await getPayload({ config });
	const subscription = await getOwnSubscription(payload, user);
	const conciergeCase = await getConciergeCaseForMwajiri(payload, user);

	return (
		<div className="space-y-6 max-w-4xl">
			<div>
				<h1 className="text-2xl font-semibold text-heading">Concierge Matching Service</h1>
				<p className="text-sm text-muted-foreground">
					Dedicated hand-picked matching for your household requirements.
				</p>
			</div>

			{!subscription || subscription.subscriptionState !== "active" ? (
				<div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
					<h3 className="text-lg font-medium text-heading">Concierge Tier Subscription Required</h3>
					<p className="text-sm text-muted-foreground max-w-md mx-auto">
						The Concierge service is available exclusively to subscribers on the Concierge tier. Please upgrade or activate your subscription to proceed.
					</p>
				</div>
			) : !conciergeCase ? (
				<div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
					<h3 className="text-lg font-medium text-heading">No Active Concierge Case</h3>
					<p className="text-sm text-muted-foreground max-w-md mx-auto">
						Your current subscription tier does not include an open Concierge case. If you have recently upgraded, please contact support or check your subscription settings.
					</p>
				</div>
			) : conciergeCase.state === "intake" ? (
				<ConciergeBriefForm
					caseId={conciergeCase.id}
					initialValues={conciergeCase.brief as Partial<BriefInput> | null}
				/>
			) : (
				<div className="space-y-6">
					<ConciergeStatusCard conciergeCase={conciergeCase} eligibleForReplacement={true} />
				</div>
			)}
		</div>
	);
};

export { Page as default };
