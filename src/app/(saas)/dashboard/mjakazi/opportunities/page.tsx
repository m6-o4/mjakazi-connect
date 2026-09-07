import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { EoiInbox } from "@/components/dashboard/mjakazi/opportunities/eoi-inbox";
import config from "@/payload-config";
import { listReceivedEois } from "@/services/eoi.service";

export const metadata: Metadata = { title: "Opportunities" };

const OpportunitiesPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const eois = await listReceivedEois(payload, user);

	// format the send date server-side so the client renders a stable label and
	// never a timezone-dependent one
	const items = eois.map((eoi) => ({
		...eoi,
		sentAtLabel: eoi.sentAt
			? new Date(eoi.sentAt).toLocaleDateString("en-GB", {
					day: "numeric",
					month: "short",
					year: "numeric",
					timeZone: "Africa/Nairobi",
				})
			: null,
	}));

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Opportunities</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Expressions of interest from waajiri who want to hire you.
				</p>
			</div>

			<EoiInbox eois={items} />
		</div>
	);
};

export { OpportunitiesPage as default };
