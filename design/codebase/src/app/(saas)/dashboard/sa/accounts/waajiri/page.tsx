import { WaajiriAccountsTable } from "@/components/dashboard/accounts/waajiri-accounts-table";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Waajiri Accounts" };

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

	// fetch the most recent 100 waajiri profiles;
	// depth:1 populates the related account so we can read clerkId and email
	// overrideAccess ensures collection-level rules don't filter out any records
	const profilesQuery = await payload.find({
		collection: "waajiriprofiles",
		overrideAccess: true,
		depth: 1,
		sort: "-createdAt",
		limit: 100,
	});

	// flatten each profile into a table-friendly shape;
	// fall back to empty strings for optional account fields to keep the UI predictable
	const accounts = profilesQuery.docs.map((profile: any) => ({
		id: profile.id,
		clerkId: profile.account?.clerkId ?? "",
		displayName: profile.displayName,
		email: profile.account?.email ?? "",
		createdAt: profile.createdAt,
	}));

	return (
		<>
			<DashboardTopbar title="Waajiri Accounts" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<WaajiriAccountsTable accounts={accounts} viewerRole="sa" />
			</main>
		</>
	);
};

export { Page as default };
