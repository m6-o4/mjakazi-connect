import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { ConciergeQueue } from "@/components/dashboard/staff/concierge/concierge-queue";
import config from "@/payload-config";
import { listConciergeCases } from "@/services/concierge.service";

export const dynamic = "force-dynamic";

const Page = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") redirect(`/dashboard/${user.role}`);

	const payload = await getPayload({ config });
	const cases = await listConciergeCases(payload, user);

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Concierge Cases Queue</h1>
				<p className="text-muted-foreground text-sm">
					Manage and review concierge matching requests, curate candidate shortlists, and
					deliver recommendations to waajiri.
				</p>
			</div>

			<ConciergeQueue cases={cases} />
		</div>
	);
};

export { Page as default };
