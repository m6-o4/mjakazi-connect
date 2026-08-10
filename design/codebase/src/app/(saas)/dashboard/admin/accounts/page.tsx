import { AccountsLanding } from "@/components/dashboard/accounts/accounts-landing";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Accounts" };

const Page = async () => {
	const { userId } = await auth();

	// unauthenticated visitors have no business on this page
	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// identity must exist and belong to a privileged role; anything else is rejected
	if (!identity) redirect("/sign-in");
	if (identity.role !== "admin" && identity.role !== "sa") redirect("/sign-in");

	// fetch both counts in parallel — neither depends on the other
	const [wajakaziCount, waajiriCount] = await Promise.all([
		payload.count({ collection: "wajakaziprofiles", overrideAccess: true }),
		payload.count({ collection: "waajiriprofiles", overrideAccess: true }),
	]);

	return (
		<>
			<DashboardTopbar title="Accounts" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				{/* hardcode viewerRole as "admin" since this page only mounts under the admin subtree */}
				<AccountsLanding
					viewerRole="admin"
					wajakaziCount={wajakaziCount.totalDocs}
					waajiriCount={waajiriCount.totalDocs}
				/>
			</main>
		</>
	);
};

export { Page as default };
