import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { StatCard } from "@/components/dashboard/overview/stat-card";
import config from "@/payload-config";

export const metadata: Metadata = { title: "Overview" };

const AdminOverviewPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin") redirect(`/dashboard/${user.role}`);

	const payload = await getPayload({ config });

	// trusted platform-wide counts — admin sees everything, and these numbers
	// never leave the overview
	const [pendingReviews, verified, activeSubscriptions, waajiri] = await Promise.all([
		payload.count({
			collection: "wajakazi-profiles",
			where: { verificationState: { equals: "pending_review" } },
			overrideAccess: true,
		}),
		payload.count({
			collection: "wajakazi-profiles",
			where: { verificationState: { equals: "verified" } },
			overrideAccess: true,
		}),
		payload.count({
			collection: "subscriptions",
			where: { subscriptionState: { equals: "active" } },
			overrideAccess: true,
		}),
		payload.count({
			collection: "users",
			where: { role: { equals: "mwajiri" } },
			overrideAccess: true,
		}),
	]);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Overview</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Platform activity at a glance.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					label="Pending verifications"
					value={pendingReviews.totalDocs}
					description="Awaiting staff review"
					href="/dashboard/staff/verifications"
				/>
				<StatCard label="Verified wajakazi" value={verified.totalDocs} />
				<StatCard label="Active subscriptions" value={activeSubscriptions.totalDocs} />
				<StatCard label="Waajiri accounts" value={waajiri.totalDocs} />
			</div>
		</div>
	);
};

export { AdminOverviewPage as default };
