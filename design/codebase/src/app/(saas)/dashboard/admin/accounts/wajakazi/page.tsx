import { WajakaziAccountsTable } from "@/components/dashboard/accounts/wajakazi-accounts-table";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Wajakazi Accounts" };

const Page = async () => {
	const { userId } = await auth();

	// unauthenticated visitors have no business on this page
	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// identity must exist and belong to a privileged role; anything else is rejected
	if (!identity) redirect("/sign-in");
	if (identity.role !== "admin" && identity.role !== "sa") redirect("/sign-in");

	// depth:1 resolves the nested account and photo relations in a single query
	// sorted newest-first so recently registered workers surface at the top
	// limit of 100 is a pragmatic cap until pagination is introduced
	const profilesQuery = await payload.find({
		collection: "wajakaziprofiles",
		overrideAccess: true,
		depth: 1,
		sort: "-createdAt",
		limit: 100,
	});

	// flatten payload's nested document shape into a plain object the table component can consume
	// optional chaining guards against profiles that were created before the account relation existed
	// photo is only usable when payload has resolved it to an object; a raw id string is treated as absent
	const accounts = profilesQuery.docs.map((profile: any) => ({
		id: profile.id,
		clerkId: profile.account?.clerkId ?? "",
		displayName: profile.displayName,
		email: profile.account?.email ?? "",
		verificationStatus: profile.verificationStatus,
		profileComplete: profile.profileComplete ?? false,
		photoUrl:
			profile.photo && typeof profile.photo === "object" ? profile.photo.url : null,
		createdAt: profile.createdAt,
		profileId: profile.id,
	}));

	return (
		<>
			<DashboardTopbar title="Wajakazi Accounts" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				{/* hardcode viewerRole as "admin" since this page only mounts under the admin subtree */}
				<WajakaziAccountsTable accounts={accounts} viewerRole="admin" />
			</main>
		</>
	);
};

export { Page as default };
