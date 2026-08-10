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
	const { userId } = await auth();

	// unauthenticated visitors have no business on this page
	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// identity must exist and belong to a privileged role; anything else is rejected
	if (!identity) redirect("/sign-in");
	if (identity.role !== "admin" && identity.role !== "sa") redirect("/sign-in");

	// depth:1 resolves the nested account relation so email and clerkId are available
	// sorted newest-first so recently registered employers surface at the top
	// limit of 100 is a pragmatic cap until pagination is introduced
	const profilesQuery = await payload.find({
		collection: "waajiriprofiles",
		overrideAccess: true,
		depth: 1,
		sort: "-createdAt",
		limit: 100,
	});

	// flatten payload's nested document shape into a plain object the table component can consume
	// optional chaining guards against profiles created before the account relation existed
	// waajiri profiles carry no photo or verification status, so the mapping is simpler than wajakazi
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
				{/* hardcode viewerRole as "admin" since this page only mounts under the admin subtree */}
				<WaajiriAccountsTable accounts={accounts} viewerRole="admin" />
			</main>
		</>
	);
};

export { Page as default };
