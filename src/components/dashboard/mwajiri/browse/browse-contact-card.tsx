"use client";

import { Lock, Mail, Phone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { sendEoiBatchAction } from "@/app/actions/eoi";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { notifySuccess } from "@/lib/notify";
import type { ProfileInterestStatus } from "@/services/eoi.service";

type Contact = {
	phone: string | null;
	email: string;
};

type BrowseContactCardProps = {
	mjakaziId: string;
	contact: Contact | null;
	interest: ProfileInterestStatus;
};

// a live contact row. `value` is null only for an unset phone — email is always
// present. a null phone renders a fallback rather than a misleading placeholder
const ContactRow = ({
	icon: Icon,
	label,
	value,
}: {
	icon: LucideIcon;
	label: string;
	value: string | null;
}) => (
	<div className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
		<span className="text-muted-foreground flex items-center gap-2 text-sm">
			<Icon className="size-4 shrink-0" />
			{label}
		</span>
		<span className="text-sm font-medium">{value ?? "Not provided"}</span>
	</div>
);

// a masked contact row — renders a placeholder, never a real value. shown until a
// mjakazi accepts the mwajiri's interest
const MaskedRow = ({ icon: Icon, label }: { icon: LucideIcon; label: string }) => (
	<div className="border-border flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
		<span className="text-muted-foreground flex items-center gap-2 text-sm">
			<Icon className="size-4 shrink-0" />
			{label}
		</span>
		<span className="text-muted-foreground flex items-center gap-1.5 text-sm font-medium">
			<Lock className="size-3.5" />
			••••••••
		</span>
	</div>
);

// the contact area on a browse detail. the contact is only ever present once a
// mjakazi has accepted an expression of interest, so the interplay is: live
// contact if granted, otherwise a send-interest control whose state reflects an
// open interest, a subscription wall, the batch gate or the re-send cooldown
const BrowseContactCard = ({ mjakaziId, contact, interest }: BrowseContactCardProps) => {
	const router = useRouter();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const send = async () => {
		setBusy(true);
		setError(null);
		try {
			const result = await sendEoiBatchAction({ mjakaziIds: [mjakaziId] });
			if (result.success) {
				posthog.capture("interest_sent", { count: 1 });
				notifySuccess("Interest sent", {
					id: "eoi-send",
					description: "They can now accept or decline.",
				});
				router.refresh();
			} else {
				setError(result.error ?? "Could not send your interest.");
			}
		} finally {
			setBusy(false);
		}
	};

	const actionArea = contact ? (
		<p className="text-muted-foreground text-xs">
			These details stay available to you even after your subscription ends.
		</p>
	) : interest.state === "sent" ? (
		<p className="text-muted-foreground text-xs">
			Interest sent. You will be able to see the contact details once they accept.
		</p>
	) : interest.state === "accepted" ? (
		<p className="text-muted-foreground text-xs">Your interest was accepted.</p>
	) : interest.canSend ? (
		<div className="flex flex-col gap-2">
			<Button type="button" onClick={send} disabled={busy}>
				{busy ? "Sending…" : "Send interest"}
			</Button>
			{error ? <p className="text-destructive text-xs">{error}</p> : null}
		</div>
	) : interest.blockCode === "subscription_required" ? (
		<div className="flex flex-col gap-2">
			<Link
				href="/dashboard/mwajiri/subscription"
				className={buttonVariants({
					className: "bg-accent text-accent-foreground hover:bg-accent/90 font-semibold",
				})}
			>
				Subscribe to send interest
			</Link>
			<p className="text-muted-foreground text-xs">
				Contact details are shared only after a mjakazi accepts your interest.
			</p>
		</div>
	) : (
		<p className="text-muted-foreground text-xs">
			{interest.blockReason ?? "You cannot send interest to this mjakazi right now."}
		</p>
	);

	return (
		<Card className="mt-2">
			<CardContent className="flex flex-col gap-4 py-6">
				<h2 className="text-heading text-lg font-semibold">Contact details</h2>

				<div className="flex flex-col gap-2">
					{contact ? (
						<>
							<ContactRow icon={Phone} label="Phone number" value={contact.phone} />
							<ContactRow icon={Mail} label="Email address" value={contact.email} />
						</>
					) : (
						<>
							<MaskedRow icon={Phone} label="Phone number" />
							<MaskedRow icon={Mail} label="Email address" />
						</>
					)}
				</div>

				{actionArea}
			</CardContent>
		</Card>
	);
};

export { BrowseContactCard };
