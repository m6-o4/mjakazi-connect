import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { ModerationTable } from "@/components/dashboard/moderation/moderation-table";
import { toWaajiriRow, toWajakaziRow } from "@/lib/account-rows";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listWaajiriAccounts, listWajakaziAccounts } from "@/services/accounts.service";

export const metadata = { title: "Moderation" };

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

	const wajakaziRows = (wajakaziResult.success ? wajakaziResult.data : []).map(
		toWajakaziRow,
	);
	const waajiriRows = (waajiriResult.success ? waajiriResult.data : []).map(toWaajiriRow);

	const canSuspend = true;
	const canReinstate = user.role === "admin";

	return (
		<div className="flex flex-col gap-8">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Moderation</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Suspend accounts for bad behaviour, or reinstate them. Every action requires a
					reason. Renaming and deletion live in the Wajakazi and Waajiri sections.
				</p>
			</div>

			<section className="flex flex-col gap-3">
				<h2 className="text-heading text-lg font-semibold">Wajakazi</h2>
				<ModerationTable
					accounts={wajakaziRows}
					canSuspend={canSuspend}
					canReinstate={canReinstate}
				/>
			</section>

			<section className="flex flex-col gap-3">
				<h2 className="text-heading text-lg font-semibold">Waajiri</h2>
				<ModerationTable
					accounts={waajiriRows}
					canSuspend={canSuspend}
					canReinstate={canReinstate}
				/>
			</section>
		</div>
	);
};

export { ModerationPage as default };
