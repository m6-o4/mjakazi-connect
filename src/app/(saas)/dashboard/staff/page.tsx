import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { StatCard } from "@/components/dashboard/overview/stat-card";
import config from "@/payload-config";

export const metadata: Metadata = { title: "Overview" };

const StaffOverviewPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "staff") redirect(`/dashboard/${user.role}`);

	const payload = await getPayload({ config });

	// trusted platform-wide counts — staff read the whole queue, and these
	// numbers never leave the overview
	const [pendingReviews, awaitingPayment, verified] = await Promise.all([
		payload.count({
			collection: "wajakazi-profiles",
			where: { verificationState: { equals: "pending_review" } },
			overrideAccess: true,
		}),
		payload.count({
			collection: "wajakazi-profiles",
			where: { verificationState: { equals: "pending_payment" } },
			overrideAccess: true,
		}),
		payload.count({
			collection: "wajakazi-profiles",
			where: { verificationState: { equals: "verified" } },
			overrideAccess: true,
		}),
	]);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Overview</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Your review queue at a glance.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
				<StatCard
					label="Pending verifications"
					value={pendingReviews.totalDocs}
					description="Awaiting review"
					href="/dashboard/staff/verifications"
				/>
				<StatCard
					label="Awaiting payment"
					value={awaitingPayment.totalDocs}
					description="Workers mid-checkout"
				/>
				<StatCard label="Verified wajakazi" value={verified.totalDocs} />
			</div>
		</div>
	);
};

export { StaffOverviewPage as default };
