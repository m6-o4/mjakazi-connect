import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { CreateStaffForm } from "@/components/dashboard/admin/staff/create-staff-form";
import { StaffTable } from "@/components/dashboard/admin/staff/staff-table";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listStaff } from "@/services/staff.service";

export const metadata = { title: "Staff" };

const AdminStaffPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin") redirect(DASHBOARD_BY_ROLE[user.role]);

	const payload = await getPayload({ config });
	const result = await listStaff(payload, user);
	const staff = result.success ? result.data : [];

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Staff</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Create and manage the team&apos;s back-office accounts.
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<CreateStaffForm />
			</div>

			<StaffTable staff={staff} currentUserId={user.id} />
		</div>
	);
};

export { AdminStaffPage as default };
