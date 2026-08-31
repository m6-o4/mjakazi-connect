import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import {
	AccountsTable,
	type AccountRow,
} from "@/components/dashboard/accounts/accounts-table";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listWajakaziAccounts } from "@/services/accounts.service";

export const metadata = { title: "Wajakazi" };

// verification state → badge label + variant. reused here until the verification
// queue (phase 3.3) needs the same mapping
const verificationBadge: Record<
	string,
	{ label: string; variant: AccountRow["statusVariant"] }
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

const WajakaziAccountsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const result = await listWajakaziAccounts(payload, user);
	const accounts = result.success ? result.data : [];

	const rows: AccountRow[] = accounts.map((account) => {
		const badge = verificationBadge[account.verificationState] ?? verificationBadge.draft;
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
			createdAt: account.createdAt,
		};
	});

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Wajakazi accounts</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Every worker registered on the platform.
				</p>
			</div>

			<AccountsTable
				accounts={rows}
				canDelete={user.role === "admin"}
				deleteDescription="This removes the account, their profile and their documents. This cannot be undone."
			/>
		</div>
	);
};

export { WajakaziAccountsPage as default };
