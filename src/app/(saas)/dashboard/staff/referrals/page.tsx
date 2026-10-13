import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { ReferralQueue } from "@/components/dashboard/staff/referrals/referral-queue";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listPendingReferrals } from "@/services/referral.service";

export const metadata = { title: "References" };

const StaffReferralsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const result = await listPendingReferrals(payload, user);
	const items = result.success ? result.data : [];

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Reference moderation</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Referrals awaiting review, oldest first.
				</p>
			</div>

			<ReferralQueue items={items} />
		</div>
	);
};

export { StaffReferralsPage as default };
