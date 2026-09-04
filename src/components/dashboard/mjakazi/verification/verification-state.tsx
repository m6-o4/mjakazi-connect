import {
	BadgeCheck,
	Ban,
	CircleOff,
	Eye,
	History,
	XCircle,
	type LucideIcon,
} from "lucide-react";

import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { WajakaziProfile } from "@/payload-types";

type VerificationState = NonNullable<WajakaziProfile["verificationState"]>;
// states that are pure status display. draft (submit flow) and pending_payment
// (pay flow) each render their own interactive component instead
type StatusState = Exclude<VerificationState, "draft" | "pending_payment">;

type VerificationStateCardProps = {
	state: StatusState;
	verificationExpiry?: string | null;
	rejectionReason?: string | null;
	freeResubmissionsRemaining?: number | null;
};

// correct, no-action status copy for every verification state that is not the
// draft submit flow or the pending-payment pay flow. the action buttons for
// review, resubmit, renew and payment land with their owning phases and slot in
// here then
const STATE_CONFIG: Record<
	StatusState,
	{ icon: LucideIcon; title: string; description: string }
> = {
	pending_review: {
		icon: Eye,
		title: "Under review",
		description: "Our team is reviewing your documents. We'll let you know the outcome.",
	},
	verified: {
		icon: BadgeCheck,
		title: "Verified",
		description: "Your profile is verified and can appear in the directory.",
	},
	rejected: {
		icon: XCircle,
		title: "Not approved",
		description: "Our team could not verify your profile.",
	},
	verification_expired: {
		icon: History,
		title: "Verification expired",
		description: "Your verified badge has expired. Renewal will be available shortly.",
	},
	blacklisted: {
		icon: Ban,
		title: "Blacklisted",
		description:
			"This profile has been blacklisted. Contact support for more information.",
	},
	deactivated: {
		icon: CircleOff,
		title: "Deactivated",
		description: "This profile has been deactivated.",
	},
};

const formatDate = (value: string): string =>
	new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "Africa/Nairobi",
	}).format(new Date(value));

const VerificationStateCard = ({
	state,
	verificationExpiry,
	rejectionReason,
	freeResubmissionsRemaining,
}: VerificationStateCardProps) => {
	const { icon: Icon, title, description } = STATE_CONFIG[state];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon className="text-accent size-5 shrink-0" />
					{title}
				</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			{state === "verified" && verificationExpiry ? (
				<CardContent className="text-muted-foreground flex flex-col gap-2 text-sm">
					<p>Valid until {formatDate(verificationExpiry)}.</p>
				</CardContent>
			) : null}
			{state === "rejected" ? (
				<CardContent className="text-muted-foreground flex flex-col gap-2 text-sm">
					{rejectionReason ? <p>Reason: {rejectionReason}</p> : null}
					{freeResubmissionsRemaining != null ? (
						<p>
							{freeResubmissionsRemaining > 0
								? `You have ${freeResubmissionsRemaining} free resubmission${freeResubmissionsRemaining === 1 ? "" : "s"} remaining.`
								: "You have no free resubmissions remaining — a new fee is required."}
						</p>
					) : null}
				</CardContent>
			) : null}
		</Card>
	);
};

export { VerificationStateCard };
export type { StatusState };
