// shared status-badge maps for the account sections and the moderation queue.
// the underlying states come from wajakazi-profiles.verificationState,
// waajiri-profiles.blacklistState and users.accountState
type AccountBadgeVariant = "default" | "secondary" | "destructive" | "outline";

type AccountBadge = { label: string; variant: AccountBadgeVariant };

const VERIFICATION_BADGE: Record<string, AccountBadge> = {
	draft: { label: "Draft", variant: "outline" },
	pending_payment: { label: "Pending payment", variant: "secondary" },
	pending_review: { label: "Pending review", variant: "secondary" },
	verified: { label: "Verified", variant: "default" },
	rejected: { label: "Rejected", variant: "destructive" },
	verification_expired: { label: "Expired", variant: "destructive" },
	blacklisted: { label: "Blacklisted", variant: "destructive" },
	deactivated: { label: "Deactivated", variant: "outline" },
};

const BLACKLIST_BADGE: Record<string, AccountBadge> = {
	active: { label: "Active", variant: "outline" },
	blacklisted: { label: "Blacklisted", variant: "destructive" },
};

const SUSPENDED_BADGE: AccountBadge = { label: "Suspended", variant: "secondary" };

export { BLACKLIST_BADGE, SUSPENDED_BADGE, VERIFICATION_BADGE };
export type { AccountBadgeVariant };
