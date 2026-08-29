import { redirect } from "next/navigation";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";

// /dashboard has no content of its own — route straight to the caller's role
const DashboardPage = async () => {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/sign-in");
	}

	redirect(DASHBOARD_BY_ROLE[user.role]);
};

export { DashboardPage as default };
