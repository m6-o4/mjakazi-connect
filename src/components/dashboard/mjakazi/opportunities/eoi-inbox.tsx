"use client";

import { Check, Inbox, X } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { respondToEoiAction } from "@/app/actions/eoi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type ReceivedEoi = {
	id: string;
	mwajiriName: string;
	mwajiriLocation: string | null;
	state: "sent" | "accepted" | "rejected" | "expired";
	sentAtLabel: string | null;
};

type EoiInboxProps = { eois: ReceivedEoi[] };

// the mjakazi's opportunities inbox. a `sent` interest shows accept/decline; a
// responded one shows its outcome. responding calls the server action, fires the
// analytics event, and refreshes so the server-rendered list reflects the new
// state.
const EoiInbox = ({ eois }: EoiInboxProps) => {
	const router = useRouter();
	const [busyId, setBusyId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const respond = async (eoiId: string, response: "accepted" | "rejected") => {
		setBusyId(eoiId);
		setError(null);
		try {
			const result = await respondToEoiAction({ eoiId, response });
			if (result.success) {
				posthog.capture("interest_responded", { response });
				router.refresh();
			} else {
				setError(result.error ?? "Could not respond.");
			}
		} finally {
			setBusyId(null);
		}
	};

	if (eois.length === 0) {
		return (
			<Card className="py-10">
				<CardContent className="flex flex-col items-center justify-center gap-3 text-center">
					<Inbox className="text-muted-foreground/40 size-10" />
					<p className="text-muted-foreground text-sm">
						No opportunities yet. Waajiri interested in hiring you will appear here.
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{error ? <p className="text-destructive text-sm">{error}</p> : null}
			{eois.map((eoi) => {
				const busy = busyId === eoi.id;
				return (
					<Card key={eoi.id}>
						<CardContent className="flex flex-col gap-3 py-5">
							<div className="flex items-start justify-between gap-3">
								<div className="flex flex-col">
									<p className="text-heading text-base font-semibold">
										{eoi.mwajiriName}
									</p>
									<p className="text-muted-foreground text-xs">
										{[eoi.mwajiriLocation, eoi.sentAtLabel]
											.filter(Boolean)
											.join(" · ")}
									</p>
								</div>
								{eoi.state === "accepted" ? (
									<Badge>Accepted</Badge>
								) : eoi.state === "rejected" ? (
									<Badge variant="secondary">Declined</Badge>
								) : (
									<Badge variant="outline">
										{eoi.state === "expired" ? "Expired" : "Pending"}
									</Badge>
								)}
							</div>

							{eoi.state === "sent" ? (
								<div className="flex gap-2">
									<Button
										type="button"
										size="sm"
										onClick={() => respond(eoi.id, "accepted")}
										disabled={busy}
										className="gap-1.5"
									>
										<Check className="size-4" />
										Accept
									</Button>
									<Button
										type="button"
										size="sm"
										variant="outline"
										onClick={() => respond(eoi.id, "rejected")}
										disabled={busy}
										className="gap-1.5"
									>
										<X className="size-4" />
										Decline
									</Button>
								</div>
							) : null}
						</CardContent>
					</Card>
				);
			})}
		</div>
	);
};

export { EoiInbox };
