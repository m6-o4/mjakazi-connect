import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { CheckCircle2, CreditCard, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Dashboard" };

// main dashboard for mwajiri, displaying subscription status and quick navigation
const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity || identity.role !== "mwajiri") redirect("/sign-in");

	// fetch the profile to read live subscription state for the dashboard card
	const profileResult = await payload.find({
		collection: "waajiriprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const profile = profileResult.docs[0] ?? null;
	const subscriptionStatus = profile?.subscriptionStatus ?? "none";
	const subscriptionTierName = profile?.subscriptionTierName ?? null;
	const subscriptionEndDate = profile?.subscriptionEndDate ?? null;

	const isActive = subscriptionStatus === "active";

	return (
		<>
			<DashboardTopbar title="My Dashboard" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
					{/* subscription status card — links to the subscription page */}
					<Link
						href="/dashboard/mwajiri/subscription"
						className="bg-card border-border hover:border-primary/40 flex flex-col gap-4 rounded-xl border p-6 transition-colors"
					>
						<p className="text-muted-foreground text-sm font-semibold">
							Subscription Status
						</p>
						<div
							className={[
								"flex items-start gap-3 rounded-lg px-4 py-3",
								isActive ? "bg-accent/10" : "bg-muted/40",
							].join(" ")}
						>
							{isActive ? (
								<CheckCircle2 className="text-accent mt-0.5 size-5 shrink-0" />
							) : (
								<CreditCard className="text-muted-foreground mt-0.5 size-5 shrink-0" />
							)}
							<div>
								<p className="text-foreground text-sm font-bold">
									{isActive
										? (subscriptionTierName ?? "Active")
										: subscriptionStatus === "expired"
											? "Subscription Expired"
											: subscriptionStatus === "pending_payment"
												? "Payment Pending"
												: "No Active Subscription"}
								</p>
								<p className="text-muted-foreground mt-0.5 text-xs">
									{isActive && subscriptionEndDate
										? `Active until ${new Date(subscriptionEndDate).toLocaleDateString("en-KE", { day: "2-digit", month: "short", year: "numeric" })}`
										: "Click to manage your subscription"}
								</p>
							</div>
						</div>
					</Link>

					{/* browse wajakazi — links to directory once subscription is active */}
					<Link
						href="/dashboard/mwajiri/browse"
						className="bg-card border-border hover:border-primary/40 flex flex-col gap-4 rounded-xl border p-6 transition-colors"
					>
						<p className="text-muted-foreground text-sm font-semibold">Browse Wajakazi</p>
						<div className="bg-primary/10 flex size-10 items-center justify-center rounded-full">
							<Search className="text-primary size-5" />
						</div>
						<p className="font-display text-foreground text-2xl font-bold">
							Find Workers
						</p>
						<p className="text-muted-foreground text-sm">
							Search and filter verified domestic workers available for hire.
						</p>
					</Link>

					<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
						<p className="text-muted-foreground text-sm font-semibold">Activity</p>
						<p className="font-display text-foreground mt-2 text-2xl font-bold">
							Coming Soon
						</p>
						<p className="text-muted-foreground text-sm">
							Your contact unlocks and hiring activity will appear here.
						</p>
					</div>
				</div>
			</main>
		</>
	);
};

export { Page as default };
