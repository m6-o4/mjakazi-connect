import { ShieldAlert, ShieldCheck, ShieldEllipsis, ShieldX } from "lucide-react";
import type { ReactNode } from "react";

interface VerificationStateProps {
	verificationState: string;
}

// centralized config avoids scattered conditionals and makes adding states trivial
const stateConfig: Record<
	string,
	{ label: string; description: string; color: string; bg: string; icon: ReactNode }
> = {
	draft: {
		label: "Draft",
		description: "Complete your profile and upload documents to begin.",
		color: "text-text-default/70",
		bg: "bg-bg-subtle",
		icon: <ShieldEllipsis className="text-text-default/70 size-5" />,
	},
	pending_payment: {
		label: "Pending Payment",
		description: "Please complete your verification fee payment to proceed.",
		color: "text-amber-600 dark:text-amber-400",
		bg: "bg-amber-50 dark:bg-amber-950/30",
		icon: <ShieldEllipsis className="size-5 text-amber-500" />,
	},
	pending_review: {
		label: "Under Review",
		description: "Your documents are being reviewed by our team.",
		color: "text-brand-primary",
		bg: "bg-brand-primary/10",
		icon: <ShieldEllipsis className="text-brand-primary size-5" />,
	},
	verified: {
		label: "Verified",
		description: "Your profile is verified and publicly visible.",
		color: "text-brand-accent",
		bg: "bg-brand-accent/10",
		icon: <ShieldCheck className="text-brand-accent size-5" />,
	},
	rejected: {
		label: "Rejected",
		description: "Your documents did not pass review. Please resubmit.",
		color: "text-red-600",
		bg: "bg-red-50",
		icon: <ShieldX className="size-5 text-red-600" />,
	},
	verification_expired: {
		label: "Expired",
		description: "Your verification has expired. Please resubmit.",
		color: "text-red-600",
		bg: "bg-red-50",
		icon: <ShieldX className="size-5 text-red-600" />,
	},
	blacklisted: {
		label: "Restricted",
		description: "Your account has been restricted. Contact support.",
		color: "text-red-600",
		bg: "bg-red-50",
		icon: <ShieldAlert className="size-5 text-red-600" />,
	},
	deactivated: {
		label: "Deactivated",
		description: "Your account has been deactivated. Contact support.",
		color: "text-red-600",
		bg: "bg-red-50",
		icon: <ShieldAlert className="size-5 text-red-600" />,
	},
};

const VerificationStatusCard = ({ verificationState }: VerificationStateProps) => {
	// fallback to draft so the card renders something meaningful for unknown states
	const config = stateConfig[verificationState] ?? stateConfig.draft;

	return (
		<div className="border-border-subtle bg-bg-subtle flex flex-col gap-4 rounded-xl border p-6 shadow-sm">
			<h3 className="font-display text-text-default text-lg font-semibold">
				Verification State
			</h3>

			<div className={`flex items-start gap-3 rounded-lg px-4 py-3 ${config.bg}`}>
				{config.icon}
				<div>
					<p className={`text-sm font-bold ${config.color}`}>{config.label}</p>
					<p className="text-text-default/70 mt-0.5 text-xs">{config.description}</p>
				</div>
			</div>
		</div>
	);
};

export { VerificationStatusCard };
