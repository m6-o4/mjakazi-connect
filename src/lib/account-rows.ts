import {
	BLACKLIST_BADGE,
	SUSPENDED_BADGE,
	VERIFICATION_BADGE,
	type AccountBadgeVariant,
} from "@/lib/account-badges";
import type { WaajiriAccount, WajakaziAccount } from "@/services/accounts.service";

// the single shape every account list renders. both the account sections and the
// moderation queue build rows through these mappers so the two surfaces can never
// disagree about an account's displayed state
type AccountRow = {
	userId: string;
	name: string;
	firstName: string;
	lastName: string;
	email: string;
	statusLabel: string;
	statusVariant: AccountBadgeVariant;
	subtitle: string | null;
	accountState: string;
	createdAt: string;
};

const toWajakaziRow = (account: WajakaziAccount): AccountRow => {
	const badge =
		account.accountState === "suspended"
			? SUSPENDED_BADGE
			: (VERIFICATION_BADGE[account.verificationState] ?? VERIFICATION_BADGE.draft);
	const legalName = [account.firstName, account.lastName]
		.filter(Boolean)
		.join(" ")
		.trim();

	return {
		userId: account.userId,
		name: account.displayName,
		firstName: account.firstName,
		lastName: account.lastName,
		email: account.email,
		statusLabel: badge.label,
		statusVariant: badge.variant,
		subtitle:
			legalName && legalName !== account.displayName ? `Legal name: ${legalName}` : null,
		accountState: account.accountState,
		createdAt: account.createdAt,
	};
};

const toWaajiriRow = (account: WaajiriAccount): AccountRow => {
	const badge =
		account.accountState === "suspended"
			? SUSPENDED_BADGE
			: (BLACKLIST_BADGE[account.blacklistState] ?? BLACKLIST_BADGE.active);

	return {
		userId: account.userId,
		name: [account.firstName, account.lastName].filter(Boolean).join(" ").trim(),
		firstName: account.firstName,
		lastName: account.lastName,
		email: account.email,
		statusLabel: badge.label,
		statusVariant: badge.variant,
		subtitle: null,
		accountState: account.accountState,
		createdAt: account.createdAt,
	};
};

export { toWaajiriRow, toWajakaziRow };
export type { AccountRow };
