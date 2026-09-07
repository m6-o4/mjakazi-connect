import { Compass, Send, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { SubscriptionStatusCard } from "@/components/dashboard/mwajiri/subscription-status-card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import config from "@/payload-config";
import { listDirectoryProfiles } from "@/services/directory.service";
import { listSentEois } from "@/services/eoi.service";
import { getOwnSubscription } from "@/services/subscription.service";

export const metadata: Metadata = { title: "Dashboard" };

const MwajiriDashboardPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });

	// limit: 1 keeps the fetch cheap — only totalDocs (the live verified+available
	// count) is needed, which comes from the same guarded path as the directory
	const [subscription, directory, sentEois] = await Promise.all([
		getOwnSubscription(payload, user),
		listDirectoryProfiles(payload, { limit: 1 }),
		listSentEois(payload, user),
	]);

	const availableCount = directory.totalDocs;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">
					Welcome{user.firstName ? `, ${user.firstName}` : ""}
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Find and connect with verified wajakazi.
				</p>
			</div>

			<SubscriptionStatusCard
				state={subscription?.subscriptionState ?? "none"}
				tierName={subscription?.tierName ?? null}
				tierExpiry={subscription?.tierExpiry ?? null}
			/>

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Users className="text-accent size-5 shrink-0" />
							Browse wajakazi
						</CardTitle>
						<CardDescription>
							{availableCount}{" "}
							{availableCount === 1 ? "verified wajakazi is" : "verified wajakazi are"}{" "}
							available now.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link href="/dashboard/mwajiri/browse" className={buttonVariants()}>
							Browse verified wajakazi
						</Link>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Compass className="text-accent size-5 shrink-0" />
							Quick actions
						</CardTitle>
						<CardDescription>Your most-used places, one click away.</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						<Link
							href="/dashboard/mwajiri/subscription"
							className={buttonVariants({ variant: "outline" })}
						>
							Manage subscription
						</Link>
						<Link
							href="/dashboard/mwajiri/settings"
							className={buttonVariants({ variant: "outline" })}
						>
							Settings
						</Link>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Send className="text-accent size-5 shrink-0" />
						Sent interests
					</CardTitle>
					<CardDescription>
						The wajakazi you have expressed interest in, and how they responded.
					</CardDescription>
				</CardHeader>
				<CardContent>
					{sentEois.length === 0 ? (
						<p className="text-muted-foreground text-sm">
							You have not sent any interest yet. Save wajakazi, then send a batch
							from your saved list.
						</p>
					) : (
						<ul className="divide-border divide-y">
							{sentEois.slice(0, 10).map((eoi) => (
								<li key={eoi.id} className="flex items-center justify-between gap-3 py-2.5">
									<span className="text-sm font-medium">{eoi.mjakaziName}</span>
									{eoi.state === "accepted" ? (
										<Badge>Accepted</Badge>
									) : eoi.state === "rejected" ? (
										<Badge variant="secondary">Declined</Badge>
									) : (
										<Badge variant="outline">Pending</Badge>
									)}
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
};

export { MwajiriDashboardPage as default };
