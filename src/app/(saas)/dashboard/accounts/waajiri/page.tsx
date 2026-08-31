import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import {
	AccountsTable,
	type AccountRow,
} from "@/components/dashboard/accounts/accounts-table";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listWaajiriAccounts } from "@/services/accounts.service";

export const metadata = { title: "Waajiri" };

const blacklistBadge: Record<
	string,
	{ label: string; variant: AccountRow["statusVariant"] }
> = {
	active: { label: "Active", variant: "outline" },
	blacklisted: { label: "Blacklisted", variant: "destructive" },
};

const WaajiriAccountsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const result = await listWaajiriAccounts(payload, user);
	const accounts = result.success ? result.data : [];

	const rows: AccountRow[] = accounts.map((account) => {
		const badge = blacklistBadge[account.blacklistState] ?? blacklistBadge.active;

		return {
			userId: account.userId,
			name: [account.firstName, account.lastName].filter(Boolean).join(" ").trim(),
			firstName: account.firstName,
			lastName: account.lastName,
			email: account.email,
			statusLabel: badge.label,
			statusVariant: badge.variant,
			subtitle: null,
			createdAt: account.createdAt,
		};
	});

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Waajiri accounts</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Every employer registered on the platform.
				</p>
			</div>

			<AccountsTable
				accounts={rows}
				canDelete={user.role === "admin"}
				deleteDescription="This removes the account and their profile. This cannot be undone."
			/>
		</div>
	);
};

export { WaajiriAccountsPage as default };
