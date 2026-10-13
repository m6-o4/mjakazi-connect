import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { InviteReferrerForm } from "@/components/dashboard/mjakazi/references/invite-referrer-form";
import { ReferralList } from "@/components/dashboard/mjakazi/references/referral-list";
import config from "@/payload-config";
import { listMjakaziReferrals } from "@/services/referral.service";

export const metadata = { title: "References" };

const MjakaziReferencesPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const result = await listMjakaziReferrals(payload, user);
	const referrals = result.success ? result.data : [];

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">References</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Referrals from employers you worked for before Mjakazi Connect. Each one is
					private — only you, the person who wrote it and our team can read it.
				</p>
			</div>

			<InviteReferrerForm />

			<div>
				<h2 className="text-heading text-lg font-semibold">Your referrals</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					Invitations you have sent and any referrals you have received.
				</p>
			</div>
			<ReferralList items={referrals} />
		</div>
	);
};

export { MjakaziReferencesPage as default };
