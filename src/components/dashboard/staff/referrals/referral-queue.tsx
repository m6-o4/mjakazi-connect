"use client";

import { Clock, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { publishReferralAction, rejectReferralAction } from "@/app/actions/referrals";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { notifySuccess } from "@/lib/notify";
import { JOB_OPTIONS } from "@/lib/profile-constants";
import type { PendingReferralItem } from "@/services/referral.service";

type ReferralQueueProps = {
	items: PendingReferralItem[];
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

const roleLabel = (value: string): string =>
	JOB_OPTIONS.find((option) => option.value === value)?.label ?? value;

// the pending referral queue. publish makes the referral count toward the
// mjakazi's references; reject requires a reason and is terminal. the queue
// re-fetches after each decision
const ReferralQueue = ({ items }: ReferralQueueProps) => {
	const router = useRouter();
	const [busyId, setBusyId] = useState<string | null>(null);
	const [rejectingId, setRejectingId] = useState<string | null>(null);
	const [reason, setReason] = useState("");
	const [error, setError] = useState<string | null>(null);

	const publish = async (id: string) => {
		setBusyId(id);
		setError(null);
		try {
			const result = await publishReferralAction(id);
			if (!result.success) {
				setError(result.error ?? "Could not publish the referral.");
				return;
			}
			notifySuccess("Referral published", { id: `referral-${id}` });
			router.refresh();
		} catch {
			setError("Could not publish the referral.");
		} finally {
			setBusyId(null);
		}
	};

	const confirmReject = async (id: string) => {
		if (!reason.trim()) {
			setError("A rejection reason is required.");
			return;
		}
		setBusyId(id);
		setError(null);
		try {
			const result = await rejectReferralAction(id, reason);
			if (!result.success) {
				setError(result.error ?? "Could not reject the referral.");
				return;
			}
			notifySuccess("Referral rejected", { id: `referral-${id}` });
			setRejectingId(null);
			setReason("");
			router.refresh();
		} catch {
			setError("Could not reject the referral.");
		} finally {
			setBusyId(null);
		}
	};

	if (items.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
				<Inbox className="text-muted-foreground size-6" />
				<p className="text-foreground mt-3 text-base font-semibold">Queue is clear</p>
				<p className="text-muted-foreground mt-1 text-sm">
					No referrals are awaiting review right now.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{error ? <p className="text-destructive text-xs">{error}</p> : null}
			{items.map((item) => {
				const from = formatDate(item.startDate);
				const until = formatDate(item.endDate);
				const period = from ? `${from}${until ? ` – ${until}` : ""}` : null;

				return (
					<Card key={item.id}>
						<CardContent className="flex flex-col gap-3 py-4">
							<div className="flex items-center justify-between gap-3">
								<div className="flex flex-wrap items-center gap-2">
									<span className="text-foreground text-sm font-semibold">
										{item.referrerName}
									</span>
									<span className="text-muted-foreground text-xs">
										former employer of {item.mjakaziDisplayName ?? "a mjakazi"}
									</span>
								</div>
								<div className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs">
									<Clock className="size-3.5" />
									{item.submittedAt
										? `Submitted ${formatDate(item.submittedAt)}`
										: "Submitted"}
								</div>
							</div>

							<p className="text-muted-foreground text-xs">
								{roleLabel(item.role)}
								{period ? ` · ${period}` : ""} · {item.referrerEmail}
							</p>

							<p className="text-foreground text-sm leading-relaxed wrap-break-word">
								{item.note}
							</p>

							{rejectingId === item.id ? (
								<div className="flex flex-col gap-2">
									<Textarea
										placeholder="Why is this referral being rejected?"
										value={reason}
										onChange={(event) => setReason(event.target.value)}
									/>
									<div className="flex gap-2">
										<Button
											type="button"
											size="sm"
											onClick={() => confirmReject(item.id)}
											disabled={busyId === item.id}
										>
											Confirm rejection
										</Button>
										<Button
											type="button"
											size="sm"
											variant="ghost"
											onClick={() => {
												setRejectingId(null);
												setReason("");
											}}
											disabled={busyId === item.id}
										>
											Cancel
										</Button>
									</div>
								</div>
							) : (
								<div className="flex gap-2">
									<Button
										type="button"
										size="sm"
										onClick={() => publish(item.id)}
										disabled={busyId === item.id}
									>
										Publish
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => {
											setRejectingId(item.id);
											setReason("");
										}}
										disabled={busyId === item.id}
									>
										Reject
									</Button>
								</div>
							)}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};

export { ReferralQueue };
