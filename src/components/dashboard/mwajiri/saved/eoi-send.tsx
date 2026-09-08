"use client";

import { Send } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { sendEoiBatchAction } from "@/app/actions/eoi";
import { Button, buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

type SendableProfile = {
	id: string;
	displayName: string;
	location: string | null;
};

type EoiSendProps = {
	profiles: SendableProfile[];
	subscriptionActive: boolean;
};

// the batch-send control on the saved page. a mwajiri selects 3–5 of their saved
// wajakazi and sends each an expression of interest as one batch. sending is
// gated on an active subscription and on the 3–5 batch bound.
const EoiSend = ({ profiles, subscriptionActive }: EoiSendProps) => {
	const router = useRouter();
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const toggle = (id: string) => {
		setError(null);
		setSelected((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else if (next.size < 5) {
				next.add(id);
			}
			return next;
		});
	};

	const send = async () => {
		setBusy(true);
		setError(null);
		try {
			const result = await sendEoiBatchAction({ mjakaziIds: [...selected] });
			if (result.success) {
				posthog.capture("interest_sent", { count: selected.size });
				setSelected(new Set());
				router.refresh();
			} else {
				setError(result.error ?? "Could not send your interest.");
			}
		} finally {
			setBusy(false);
		}
	};

	const canSend = subscriptionActive && selected.size >= 3 && selected.size <= 5;

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Send className="text-accent size-5 shrink-0" />
					Express interest
				</CardTitle>
				<CardDescription>
					Select 3–5 wajakazi to send each of them an expression of interest.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="flex flex-col gap-2">
					{profiles.map((profile) => {
						const checked = selected.has(profile.id);
						return (
							<label
								key={profile.id}
								className="border-border hover:bg-muted/50 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors"
							>
								<input
									type="checkbox"
									checked={checked}
									onChange={() => toggle(profile.id)}
									disabled={!subscriptionActive}
									className="bg-background border-input text-primary focus-visible:ring-ring size-4 shrink-0 cursor-pointer rounded-sm"
								/>
								<span className="flex flex-1 flex-col">
									<span className="text-sm font-medium">{profile.displayName}</span>
									{profile.location ? (
										<span className="text-muted-foreground text-xs">
											{profile.location}
										</span>
									) : null}
								</span>
							</label>
						);
					})}
				</div>

				<div className="flex flex-col gap-2">
					<p className="text-muted-foreground text-xs">
						{selected.size === 0
							? "No wajakazi selected."
							: `${selected.size} selected${selected.size < 3 ? " — select at least 3" : ""}.`}
					</p>

					{subscriptionActive ? (
						<Button type="button" onClick={send} disabled={!canSend || busy}>
							{busy
								? "Sending…"
								: selected.size > 0
									? `Send interest to ${selected.size} wajakazi`
									: "Send interest"}
						</Button>
					) : (
						<div className="flex flex-col gap-2">
							<Link
								href="/dashboard/mwajiri/subscription"
								className={buttonVariants({
									className:
										"bg-accent text-accent-foreground hover:bg-accent/90 font-semibold",
								})}
							>
								Subscribe to send interest
							</Link>
							<p className="text-muted-foreground text-xs">
								An active subscription is required to send expressions of interest.
							</p>
						</div>
					)}

					{error ? <p className="text-destructive text-xs">{error}</p> : null}
				</div>
			</CardContent>
		</Card>
	);
};

export { EoiSend };
