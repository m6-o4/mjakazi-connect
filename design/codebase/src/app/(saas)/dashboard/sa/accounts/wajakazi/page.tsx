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
	// require an authenticated Clerk session
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });

	// resolve the platform identity tied to this Clerk user
	const identity = await resolveIdentity(payload, userId);

	// guard: identity must exist and belong to a super-admin
	if (!identity) redirect("/sign-in");
	if (identity.role !== "sa") redirect("/sign-in");

	// fetch the most recent 100 wajakazi profiles;
	// depth:1 populates the related account so we can read clerkId, email, and photo url
	// overrideAccess ensures collection-level rules don't filter out any records
	const profilesQuery = await payload.find({
		collection: "wajakaziprofiles",
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
		verificationStatus: profile.verificationStatus,
		profileComplete: profile.profileComplete ?? false,
		// photo is a populated media object at depth:1; extract the url if present
		photoUrl:
			profile.photo && typeof profile.photo === "object" ? profile.photo.url : null,
		createdAt: profile.createdAt,
		profileId: profile.id,
	}));

	return (
		<>
			<DashboardTopbar title="Wajakazi Accounts" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<WajakaziAccountsTable accounts={accounts} viewerRole="sa" />
			</main>
		</>
	);
};

export { Page as default };
