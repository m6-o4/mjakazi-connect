import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { AccountsTable } from "@/components/dashboard/accounts/accounts-table";
import { toWajakaziRow, type AccountRow } from "@/lib/account-rows";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listWajakaziAccounts } from "@/services/accounts.service";

export const metadata: Metadata = { title: "Wajakazi" };

const WajakaziAccountsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const result = await listWajakaziAccounts(payload, user);

	const rows: AccountRow[] = (result.success ? result.data : []).map(toWajakaziRow);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Wajakazi</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Edit a worker&apos;s name, or permanently delete the account and all of its
					data.
				</p>
			</div>

			<AccountsTable accounts={rows} canDelete={user.role === "admin"} />
		</div>
	);
};

export { WajakaziAccountsPage as default };
