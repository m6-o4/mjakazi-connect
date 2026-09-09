import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import {
	ModerationTable,
	type ModerationRow,
} from "@/components/dashboard/moderation/moderation-table";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import {
	listWaajiriAccounts,
	listWajakaziAccounts,
} from "@/services/accounts.service";

export const metadata = { title: "Moderation" };

const verificationBadge: Record<
	string,
	{ label: string; variant: ModerationRow["statusVariant"] }
> = {
	draft: { label: "Draft", variant: "outline" },
	pending_payment: { label: "Pending payment", variant: "secondary" },
	pending_review: { label: "Pending review", variant: "secondary" },
	verified: { label: "Verified", variant: "default" },
	rejected: { label: "Rejected", variant: "destructive" },
	verification_expired: { label: "Expired", variant: "destructive" },
	blacklisted: { label: "Blacklisted", variant: "destructive" },
	deactivated: { label: "Deactivated", variant: "outline" },
};

const blacklistBadge: Record<
	string,
	{ label: string; variant: ModerationRow["statusVariant"] }
> = {
	active: { label: "Active", variant: "outline" },
	blacklisted: { label: "Blacklisted", variant: "destructive" },
};

const suspendedBadge = { label: "Suspended", variant: "secondary" as const };

const ModerationPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const [wajakaziResult, waajiriResult] = await Promise.all([
		listWajakaziAccounts(payload, user),
		listWaajiriAccounts(payload, user),
	]);

	const wajakaziRows: ModerationRow[] = (wajakaziResult.success ? wajakaziResult.data : []).map(
		(account) => {
			const badge =
				account.accountState === "suspended"
					? suspendedBadge
					: (verificationBadge[account.verificationState] ?? verificationBadge.draft);
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
					legalName && legalName !== account.displayName
						? `Legal name: ${legalName}`
						: null,
				accountState: account.accountState,
				createdAt: account.createdAt,
			};
		},
	);

	const waajiriRows: ModerationRow[] = (waajiriResult.success ? waajiriResult.data : []).map(
		(account) => {
			const badge =
				account.accountState === "suspended"
					? suspendedBadge
					: (blacklistBadge[account.blacklistState] ?? blacklistBadge.active);

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
		},
	);

	const canSuspend = true;
	const canReinstate = user.role === "admin";
	const canDelete = user.role === "admin";

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Moderation</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Suspend accounts for bad behaviour, reinstate them, or delete them. Every
					action requires a reason.
				</p>
			</div>

			<section className="flex flex-col gap-3">
				<h2 className="text-heading text-lg font-semibold">Wajakazi</h2>
				<ModerationTable
					accounts={wajakaziRows}
					canSuspend={canSuspend}
					canReinstate={canReinstate}
					canDelete={canDelete}
				/>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-heading text-lg font-semibold">Waajiri</h2>
				<ModerationTable
					accounts={waajiriRows}
					canSuspend={canSuspend}
					canReinstate={canReinstate}
					canDelete={canDelete}
				/>
			</section>
		</div>
	);
};

export { ModerationPage as default };
