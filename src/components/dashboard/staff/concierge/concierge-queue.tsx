"use client";

import { Clock, Crown, Inbox, UserCheck } from "lucide-react";
import Link from "next/link";

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
			<Card className="space-y-3 p-8 text-center">
				<Inbox className="text-muted-foreground mx-auto size-8" />
				<h3 className="text-heading text-lg font-medium">No Concierge Cases</h3>
				<p className="text-muted-foreground text-sm">
					There are no active or pending concierge cases in the queue.
				</p>
			</Card>
		);
	}

	return (
		<div className="space-y-4">
			{cases.map((item) => {
				const mwajiriUser =
					typeof item.mwajiri === "object" ? (item.mwajiri as User) : null;
				const assignedUser =
					typeof item.assignedTo === "object" ? (item.assignedTo as User) : null;
				const brief = item.brief;

				const mwajiriName = mwajiriUser
					? [mwajiriUser.firstName, mwajiriUser.lastName].filter(Boolean).join(" ") ||
						mwajiriUser.email
					: "Unknown Mwajiri";

				return (
					<Card key={item.id} className="hover:border-primary/40 transition-colors">
						<CardContent className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center">
							<div className="space-y-2">
								<div className="flex flex-wrap items-center gap-2">
									<Crown className="text-accent size-4 shrink-0" />
									<span className="text-foreground text-base font-semibold">
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
									<p className="text-muted-foreground text-sm">
										<span className="text-foreground font-medium capitalize">
											{brief.jobCategory.replace("_", " ")}
										</span>{" "}
										in <span className="capitalize">{brief.location}</span> &bull; KSh{" "}
										{brief.salaryMin?.toLocaleString()} -{" "}
										{brief.salaryMax?.toLocaleString()} / mo &bull;{" "}
										<span className="capitalize">
											{brief.workPreference?.replace("_", "-")}
										</span>
									</p>
								) : (
									<p className="text-muted-foreground text-sm italic">
										Brief not yet submitted by Mwajiri
									</p>
								)}

								<div className="text-muted-foreground flex flex-wrap items-center gap-4 text-xs">
									<span className="flex items-center gap-1">
										<Clock className="size-3" />
										Updated {new Date(item.updatedAt).toLocaleDateString("en-GB")}
									</span>
									{assignedUser && (
										<span className="flex items-center gap-1">
											<UserCheck className="text-primary size-3" />
											Assigned:{" "}
											{[assignedUser.firstName, assignedUser.lastName]
												.filter(Boolean)
												.join(" ")}
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
