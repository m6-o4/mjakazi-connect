import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { CheckCircle, Clock, Users } from "lucide-react";
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

	if (!identity) redirect("/sign-in");
	if (identity.role !== "admin" && identity.role !== "sa") redirect("/sign-in");

	// fetch only counts — limit: 0 skips document hydration entirely
	const [pendingVerifications, verifiedWajakazi, totalWaajiri] = await Promise.all([
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
	]);

	return (
		<>
			<DashboardTopbar title="Admin Dashboard" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{/* pending verifications — primary action card, links directly to the queue */}
					<Link
						href="/dashboard/admin/verifications"
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
				</div>
			</main>
		</>
	);
};

export { Page as default };
