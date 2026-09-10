"use client";

import Link from "next/link";
import { Clock, Crown, Inbox, UserCheck } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { ConciergeCase, User } from "@/payload-types";

type Props = {
	cases: ConciergeCase[];
};

const ConciergeQueue = ({ cases }: Props) => {
	if (cases.length === 0) {
		return (
			<Card className="p-8 text-center space-y-3">
				<Inbox className="mx-auto size-8 text-muted-foreground" />
				<h3 className="text-lg font-medium text-heading">No Concierge Cases</h3>
				<p className="text-sm text-muted-foreground">
					There are no active or pending concierge cases in the queue.
				</p>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{cases.map((item) => {
				const mwajiriUser = typeof item.mwajiri === "object" ? (item.mwajiri as User) : null;
				const assignedUser = typeof item.assignedTo === "object" ? (item.assignedTo as User) : null;
				const brief = item.brief;

				const mwajiriName = mwajiriUser
					? [mwajiriUser.firstName, mwajiriUser.lastName].filter(Boolean).join(" ") || mwajiriUser.email
					: "Unknown Mwajiri";

				return (
					<Card key={item.id} className="hover:border-primary/40 transition-colors">
						<CardContent className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div className="space-y-2">
								<div className="flex flex-wrap items-center gap-2">
									<Crown className="size-4 text-accent shrink-0" />
									<span className="font-semibold text-foreground text-base">
										{mwajiriName}
									</span>
									<Badge
										variant={
											item.state === "shortlist_delivered"
												? "default"
												: item.state === "closed"
													? "secondary"
													: item.state === "in_review"
														? "outline"
														: "outline"
										}
									>
										{item.state === "intake" && "Awaiting Brief"}
										{item.state === "in_review" && "In Review"}
										{item.state === "shortlist_delivered" && "Shortlist Delivered"}
										{item.state === "closed" && "Closed"}
										{item.state === "replacement_requested" && "Replacement Requested"}
									</Badge>
								</div>

								{brief && brief.jobCategory ? (
									<p className="text-sm text-muted-foreground">
										<span className="font-medium text-foreground capitalize">
											{brief.jobCategory.replace("_", " ")}
										</span>{" "}
										in <span className="capitalize">{brief.location}</span> &bull; KSh{" "}
										{brief.salaryMin?.toLocaleString()} - {brief.salaryMax?.toLocaleString()} / mo &bull;{" "}
										<span className="capitalize">{brief.workPreference?.replace("_", "-")}</span>
									</p>
								) : (
									<p className="text-sm text-muted-foreground italic">
										Brief not yet submitted by Mwajiri
									</p>
								)}

								<div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
									<span className="flex items-center gap-1">
										<Clock className="size-3" />
										Updated {new Date(item.updatedAt).toLocaleDateString("en-GB")}
									</span>
									{assignedUser && (
										<span className="flex items-center gap-1">
											<UserCheck className="size-3 text-primary" />
											Assigned: {[assignedUser.firstName, assignedUser.lastName].filter(Boolean).join(" ")}
										</span>
									)}
								</div>
							</div>

							<div className="shrink-0">
								<Link
									href={`/dashboard/staff/concierge/${item.id}`}
									className={buttonVariants({ variant: "outline", size: "sm" })}
								>
									Manage Case
								</Link>
							</div>
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};

export { ConciergeQueue };
