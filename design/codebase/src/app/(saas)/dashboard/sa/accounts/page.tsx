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
	// require an authenticated Clerk session
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });

	// resolve the platform identity tied to this Clerk user
	const identity = await resolveIdentity(payload, userId);

	// guard: identity must exist and belong to a super-admin
	if (!identity) redirect("/sign-in");
	if (identity.role !== "sa") redirect("/sign-in");

	// fetch total account counts in parallel to minimise latency;
	// overrideAccess bypasses collection-level access rules so the sa gets accurate totals
	const [wajakaziCount, waajiriCount] = await Promise.all([
		payload.count({ collection: "wajakaziprofiles", overrideAccess: true }),
		payload.count({ collection: "waajiriprofiles", overrideAccess: true }),
	]);

	return (
		<>
			<DashboardTopbar title="Accounts" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				{/* pass pre-fetched counts so the client component needs no additional requests */}
				<AccountsLanding
					viewerRole="sa"
					wajakaziCount={wajakaziCount.totalDocs}
					waajiriCount={waajiriCount.totalDocs}
				/>
			</main>
		</>
	);
};

export { Page as default };
