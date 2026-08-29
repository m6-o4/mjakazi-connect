import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";

// authenticated dashboard shell: sidebar + topbar wrapped around every
// /dashboard/* page. getCurrentUser resolves the payload record (and thus the
// role and name) by running the clerk auth strategy against the request
const DashboardLayout = async ({ children }: { children: ReactNode }) => {
	const user = await getCurrentUser();

	if (!user) {
		redirect("/sign-in");
	}

	return (
		<div className="bg-background flex min-h-screen">
			<Sidebar role={user.role} />
			<div className="flex flex-1 flex-col">
				<Topbar user={user} />
				<main className="flex-1 p-6">{children}</main>
			</div>
		</div>
	);
};

export { DashboardLayout as default };
