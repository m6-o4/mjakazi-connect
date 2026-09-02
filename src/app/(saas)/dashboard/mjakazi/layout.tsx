import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";

// every mjakazi sub-page nests under this layout and inherits this guard. a
// non-mjakazi is bounced to their own dashboard with their session intact —
// never signed out
const MjakaziDashboardLayout = async ({ children }: { children: ReactNode }) => {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/sign-in");
	}

	if (user.role !== "mjakazi") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	return <>{children}</>;
};

export { MjakaziDashboardLayout as default };
