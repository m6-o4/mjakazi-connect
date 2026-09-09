import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { RevenueCard } from "@/components/dashboard/admin/revenue-card";
import { getCurrentUser } from "@/components/admin/get-current-user";
import { StatCard } from "@/components/dashboard/overview/stat-card";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import config from "@/payload-config";
import { getRevenueSnapshot, getVerificationThroughput } from "@/services/admin.service";

export const metadata: Metadata = { title: "Overview" };

const QUICK_ACTIONS = [
	{ href: "/dashboard/staff/verifications", label: "Review verifications" },
	{ href: "/dashboard/staff/reviews", label: "Moderate reviews" },
	{ href: "/dashboard/moderation", label: "Moderate accounts" },
	{ href: "/dashboard/admin/staff", label: "Manage staff" },
	{ href: "/dashboard/admin/settings", label: "Platform settings" },
];

const AdminOverviewPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin") redirect(`/dashboard/${user.role}`);

	const payload = await getPayload({ config });

	// trusted platform-wide counts — admin sees everything, and these numbers
	// never leave the overview
	const [
		pendingReviews,
		verified,
		activeSubscriptions,
		waajiri,
		wajakazi,
		totalProfiles,
		suspended,
		throughput,
		revenue,
	] = await Promise.all([
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
		payload.count({
			collection: "users",
			where: { role: { equals: "mjakazi" } },
			overrideAccess: true,
		}),
		payload.count({
			collection: "wajakazi-profiles",
			overrideAccess: true,
		}),
		payload.count({
			collection: "users",
			where: { accountState: { equals: "suspended" } },
			overrideAccess: true,
		}),
		getVerificationThroughput(payload),
		getRevenueSnapshot(payload),
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
				<StatCard label="Wajakazi accounts" value={wajakazi.totalDocs} />
				<StatCard
					label="Total profiles"
					value={totalProfiles.totalDocs}
					description="All wajakazi profiles"
				/>
				<StatCard
					label="Suspended accounts"
					value={suspended.totalDocs}
					description="Review in moderation"
					href="/dashboard/moderation"
				/>
				<Card className="h-full">
					<CardHeader>
						<CardTitle>Quick actions</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{QUICK_ACTIONS.map((action) => (
							<Link
								key={action.href}
								href={action.href}
								className="text-primary hover:underline"
							>
								{action.label}
							</Link>
						))}
					</CardContent>
				</Card>
			</div>

			<div className="grid gap-4 lg:grid-cols-2">
				<RevenueCard snapshot={revenue} />
				<Card className="h-full">
					<CardHeader>
						<CardTitle>Verification throughput</CardTitle>
						<CardDescription>Review decisions in the last 30 days.</CardDescription>
					</CardHeader>
					<CardContent className="flex items-end justify-around gap-4 text-center">
						<div>
							<p className="text-muted-foreground text-sm">Approved</p>
							<p className="text-heading text-3xl font-semibold">
								{throughput.approved}
							</p>
						</div>
						<div>
							<p className="text-muted-foreground text-sm">Rejected</p>
							<p className="text-heading text-3xl font-semibold">
								{throughput.rejected}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};

export { AdminOverviewPage as default };
