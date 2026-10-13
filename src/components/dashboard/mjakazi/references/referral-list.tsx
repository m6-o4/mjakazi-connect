"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { withdrawInviteAction } from "@/app/actions/referrals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notifyError, notifySuccess } from "@/lib/notify";
import type { MjakaziReferralItem } from "@/services/referral.service";

type ReferralListProps = {
	items: MjakaziReferralItem[];
};

const STATE_LABELS: Record<MjakaziReferralItem["state"], string> = {
	invited: "Awaiting their response",
	pending: "In review",
	published: "Published",
	rejected: "Not approved",
	withdrawn: "Withdrawn",
	expired: "Expired",
};

const formatDate = (value: string | null): string | null =>
	value
		? new Intl.DateTimeFormat("en-GB", {
				day: "numeric",
				month: "short",
				year: "numeric",
				timeZone: "Africa/Nairobi",
			}).format(new Date(value))
		: null;

// the worker's referral invites and outcomes. only an unanswered invite can be
// withdrawn — once the referrer submits, staff own the decision. the note is
// private to the worker, the referrer and staff
const ReferralList = ({ items }: ReferralListProps) => {
	const router = useRouter();
	const [pendingId, setPendingId] = useState<string | null>(null);

	const withdraw = async (id: string) => {
		setPendingId(id);
		try {
			const result = await withdrawInviteAction(id);
			if (!result.success) {
				notifyError(result.error ?? "Could not withdraw the invitation.");
				return;
			}
			notifySuccess("Invitation withdrawn");
			router.refresh();
		} catch {
			notifyError("Could not withdraw the invitation.");
		} finally {
			setPendingId(null);
		}
	};

	if (items.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center gap-2 py-10 text-center">
					<p className="text-muted-foreground text-sm">
						No referrals yet. Invite a former employer and their referral will appear here
						once our team reviews it.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{items.map((item) => {
				const date = formatDate(item.publishedAt ?? item.submittedAt ?? item.invitedAt);
				return (
					<Card key={item.id}>
						<CardContent className="flex flex-col gap-2 py-4">
							<div className="flex flex-wrap items-center gap-2">
								<span className="text-foreground text-sm font-medium">
									{item.referrerName}
								</span>
								<Badge variant="secondary">{STATE_LABELS[item.state]}</Badge>
								{date ? (
									<span className="text-muted-foreground text-xs">{date}</span>
								) : null}
							</div>

							{item.note ? (
								<p className="text-foreground text-sm leading-relaxed wrap-break-word">
									{item.note}
								</p>
							) : (
								<p className="text-muted-foreground text-sm">
									We emailed {item.referrerEmail} — waiting for them to respond.
								</p>
							)}

							{item.rejectionReason ? (
								<p className="text-destructive text-xs">
									Not approved: {item.rejectionReason}
								</p>
							) : null}

							{item.state === "invited" ? (
								<Button
									variant="outline"
									size="sm"
									className="self-start"
									onClick={() => withdraw(item.id)}
									disabled={pendingId === item.id}
								>
									{pendingId === item.id ? "Withdrawing..." : "Withdraw"}
								</Button>
							) : null}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};

export { ReferralList };
