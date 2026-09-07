"use client";

import { Lock, Mail, Phone, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { revealContactAction } from "@/app/actions/contact";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type Contact = {
	phone: string | null;
	email: string;
};

type BrowseContactCardProps = {
	mjakaziId: string;
	isActive: boolean;
	contact: Contact | null;
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

// a masked contact row — renders a placeholder, never a real value. shown before
// the reveal, when the phone/email have not been selected on the page at all
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

// the contact area on a browse detail. three states: already unlocked (live
// contact, passed from the server), active but not yet unlocked (reveal button),
// or not active (subscribe CTA). the reveal stores the returned contact locally,
// so no server re-render is needed to show it
const BrowseContactCard = ({ mjakaziId, isActive, contact }: BrowseContactCardProps) => {
	const router = useRouter();
	const [revealed, setRevealed] = useState<Contact | null>(contact);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const reveal = async () => {
		setBusy(true);
		setError(null);
		try {
			const result = await revealContactAction({ mjakaziId });
			if (result.success) {
				setRevealed({ phone: result.phone ?? null, email: result.email ?? "" });
				posthog.capture("contact_unlocked", {
					tierAtUnlock: result.tierAtUnlock ?? null,
				});
				router.refresh();
			} else {
				setError(result.error ?? "Could not unlock contact details.");
			}
		} finally {
			setBusy(false);
		}
	};

	return (
		<Card className="mt-2">
			<CardContent className="flex flex-col gap-4 py-6">
				<h2 className="text-heading text-lg font-semibold">Contact details</h2>

				{revealed ? (
					<div className="flex flex-col gap-2">
						<ContactRow icon={Phone} label="Phone number" value={revealed.phone} />
						<ContactRow icon={Mail} label="Email address" value={revealed.email} />
					</div>
				) : (
					<div className="flex flex-col gap-2">
						<MaskedRow icon={Phone} label="Phone number" />
						<MaskedRow icon={Mail} label="Email address" />
					</div>
				)}

				{revealed ? (
					<p className="text-muted-foreground text-xs">
						Contact details are unlocked and remain available to you.
					</p>
				) : isActive ? (
					<div className="flex flex-col gap-2">
						<Button type="button" onClick={reveal} disabled={busy}>
							{busy ? "Unlocking…" : "Unlock contact details"}
						</Button>
						{error ? <p className="text-destructive text-xs">{error}</p> : null}
					</div>
				) : (
					<div className="flex flex-col gap-2">
						<Link
							href="/dashboard/mwajiri/subscription"
							className={buttonVariants({
								className:
									"bg-accent text-accent-foreground hover:bg-accent/90 font-semibold",
							})}
						>
							Subscribe to unlock
						</Link>
						<p className="text-muted-foreground text-xs">
							Phone and email are shared with subscribed waajiri only.
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
};

export { BrowseContactCard };
