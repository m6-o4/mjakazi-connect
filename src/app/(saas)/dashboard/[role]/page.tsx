import { redirect } from "next/navigation";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { DASHBOARD_BY_ROLE, isValidRole } from "@/lib/roles";

type Args = {
	params: Promise<{ role: string }>;
};

const RoleDashboardPage = async ({ params }: Args) => {
	const { role } = await params;
	const user = await getCurrentUser();

	if (!user) {
		redirect("/sign-in");
	}

	// a user may only reach their own dashboard. an unknown or mismatched role
	// bounces to their real one — the session is never signed out
	if (!isValidRole(role) || role !== user.role) {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	return (
		<div>
			<h1 className="text-heading text-2xl font-semibold capitalize">
				{user.role} dashboard
			</h1>
			<p className="text-muted-foreground mt-2">
				Dashboard content arrives in later phases.
			</p>
		</div>
	);
};

export { RoleDashboardPage as default };
