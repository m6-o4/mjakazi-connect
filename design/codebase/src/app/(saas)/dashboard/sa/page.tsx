import { RevenueCard } from "@/components/dashboard/sa/revenue-card";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import {
	CheckCircle,
	Clock,
	CreditCard,
	Settings,
	Users,
	UsersRound,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// authorize admin access
	if (!identity) redirect("/sign-in");
	if (identity.role !== "sa") redirect("/sign-in");

	// calculate month start for revenue filtering
	const now = new Date();
	const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

	// fetch core platform metrics
	const [
		pendingVerifications,
		verifiedWajakazi,
		totalWaajiri,
		activeSubscriptions,
		totalAccounts,
		staffAccounts,
		confirmedPaymentDocs,
		confirmedSubscriptionDocs,
	] = await Promise.all([
		payload.find({
			collection: "wajakaziprofiles",
			where: { verificationStatus: { equals: "pending_review" } },
			overrideAccess: true,
			limit: 0,
		}),
		payload.find({
			collection: "wajakaziprofiles",
			where: { verificationStatus: { equals: "verified" } },
			overrideAccess: true,
			limit: 0,
		}),
		payload.find({
			collection: "accounts",
			where: { role: { equals: "mwajiri" } },
			overrideAccess: true,
			limit: 0,
		}),
		payload.find({
			collection: "subscriptions",
			where: { status: { equals: "active" } },
			overrideAccess: true,
			limit: 0,
		}),
		payload.find({
			collection: "accounts",
			overrideAccess: true,
			limit: 0,
		}),
		payload.find({
			collection: "accounts",
			where: { role: { in: ["admin", "sa"] } },
			overrideAccess: true,
			limit: 0,
		}),
		// fetch confirmed registration payments for revenue summation
		payload.find({
			collection: "payments",
			where: { status: { equals: "confirmed" } },
			overrideAccess: true,
			limit: 10000,
			pagination: false,
		}),
		// fetch paid subscriptions — active and expired both represent collected revenue
		payload.find({
			collection: "subscriptions",
			where: { status: { in: ["active", "expired"] } },
			overrideAccess: true,
			limit: 10000,
			pagination: false,
		}),
	]);

	// compute lifetime and monthly revenue
	const lifetimeRegistrations = confirmedPaymentDocs.docs.reduce(
		(sum, p) => sum + (p.amount ?? 0),
		0,
	);

	// sum lifetime subscription revenue
	const lifetimeSubscriptions = confirmedSubscriptionDocs.docs.reduce(
		(sum, s) => sum + (s.amount ?? 0),
		0,
	);

	// sum this month's registration revenue
	const monthRegistrations = confirmedPaymentDocs.docs
		.filter((p) => p.createdAt >= startOfMonth)
		.reduce((sum, p) => sum + (p.amount ?? 0), 0);

	// sum this month's subscription revenue
	const monthSubscriptions = confirmedSubscriptionDocs.docs
		.filter((s) => s.createdAt >= startOfMonth)
		.reduce((sum, s) => sum + (s.amount ?? 0), 0);

	return (
		<>
			<DashboardTopbar title="Super Admin Dashboard" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid items-start gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{/* pending verifications; links to queue */}
					<Link
						href="/dashboard/sa/verifications"
						className="bg-card border-border hover:border-primary/50 flex flex-col gap-3 rounded-xl border p-6 transition-colors"
					>
						<div className="flex items-center gap-2">
							<Clock className="text-muted-foreground size-4" />
							<p className="text-muted-foreground text-sm font-semibold">
								Pending Verifications
							</p>
						</div>
						<p className="font-display text-foreground text-3xl font-bold">
							{pendingVerifications.totalDocs}
						</p>
						<p className="text-muted-foreground text-sm">
							Wajakazi awaiting review and approval.
						</p>
					</Link>

					{/* settings access */}
					<Link
						href="/dashboard/sa/settings"
						className="bg-card border-border hover:border-primary/50 flex flex-col gap-3 rounded-xl border p-6 transition-colors"
					>
						<div className="flex items-center gap-2">
							<Settings className="text-muted-foreground size-4" />
							<p className="text-muted-foreground text-sm font-semibold">Settings</p>
						</div>
						<p className="font-display text-foreground text-3xl font-bold">Platform</p>
						<p className="text-muted-foreground text-sm">
							Manage registration fees and subscription tiers.
						</p>
					</Link>

					<div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-6">
						<div className="flex items-center gap-2">
							<UsersRound className="text-muted-foreground size-4" />
							<p className="text-muted-foreground text-sm font-semibold">
								Total Accounts
							</p>
						</div>
						<p className="font-display text-foreground text-3xl font-bold">
							{totalAccounts.totalDocs}
						</p>
						<p className="text-muted-foreground text-sm">
							All registered accounts across all roles. {staffAccounts.totalDocs} staff.
						</p>
					</div>

					<div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-6">
						<div className="flex items-center gap-2">
							<CheckCircle className="text-muted-foreground size-4" />
							<p className="text-muted-foreground text-sm font-semibold">
								Verified Wajakazi
							</p>
						</div>
						<p className="font-display text-foreground text-3xl font-bold">
							{verifiedWajakazi.totalDocs}
						</p>
						<p className="text-muted-foreground text-sm">
							Workers verified and available for hire.
						</p>
					</div>

					<div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-6">
						<div className="flex items-center gap-2">
							<CreditCard className="text-muted-foreground size-4" />
							<p className="text-muted-foreground text-sm font-semibold">
								Active Subscriptions
							</p>
						</div>
						<p className="font-display text-foreground text-3xl font-bold">
							{activeSubscriptions.totalDocs}
						</p>
						<p className="text-muted-foreground text-sm">
							Waajiri with a currently active subscription.
						</p>
					</div>

					<div className="bg-card border-border flex flex-col gap-3 rounded-xl border p-6">
						<div className="flex items-center gap-2">
							<Users className="text-muted-foreground size-4" />
							<p className="text-muted-foreground text-sm font-semibold">
								Registered Waajiri
							</p>
						</div>
						<p className="font-display text-foreground text-3xl font-bold">
							{totalWaajiri.totalDocs}
						</p>
						<p className="text-muted-foreground text-sm">
							Employer accounts on the platform.
						</p>
					</div>

					{/* revenue summary */}
					<RevenueCard
						lifetimeRegistrations={lifetimeRegistrations}
						lifetimeSubscriptions={lifetimeSubscriptions}
						monthRegistrations={monthRegistrations}
						monthSubscriptions={monthSubscriptions}
					/>
				</div>
			</main>
		</>
	);
};

export { Page as default };
