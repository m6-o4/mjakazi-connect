import { CreateStaffForm } from "@/components/dashboard/sa/create-staff-form";
import { StaffTable } from "@/components/dashboard/sa/staff-table";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

// force server-side render on every request so router.refresh() always
// receives fresh data after create and delete operations.
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Staff" };

// main staff management dashboard page for super admins
const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// security checks for access
	if (!identity) redirect("/sign-in");
	if (identity.role !== "sa") redirect("/sign-in");

	// fetch staff accounts from cms
	const staffAccounts = await payload.find({
		collection: "accounts",
		where: { role: { in: ["admin", "sa"] } },
		overrideAccess: true,
		sort: "-createdAt",
		limit: 100,
	});

	// map cms format to component-friendly props
	const staff = staffAccounts.docs.map((account: any) => ({
		id: account.id,
		clerkId: account.clerkId,
		firstName: account.firstName ?? "",
		lastName: account.lastName ?? "",
		email: account.email,
		role: account.role,
		createdAt: account.createdAt,
	}));

	return (
		<>
			<DashboardTopbar title="Staff Management" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid gap-6 md:grid-cols-2">
					<CreateStaffForm />
				</div>
				<StaffTable staff={staff} currentUserClerkId={userId} />
			</main>
		</>
	);
};

export { Page as default };
