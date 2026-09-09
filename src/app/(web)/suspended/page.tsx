import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";

export const metadata: Metadata = { title: "Account Suspended" };

// shown to a suspended user who signs in. the dashboard and payload layouts
// redirect here before rendering, so this is the only surface a suspended
// account can reach. the reason is surfaced here rather than emailed
const SuspendedPage = async () => {
	const user = await getCurrentUser();

	if (!user) redirect("/");

	if (user.accountState !== "suspended") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	return (
		<div className="mx-auto flex max-w-xl flex-col gap-4 px-4 py-16">
			<h1 className="text-heading text-3xl font-semibold">Account suspended</h1>
			<p className="text-muted-foreground text-base">
				Your account has been suspended. If you believe this is a mistake, contact
				support.
			</p>
			{user.suspensionReason && (
				<div className="bg-card border-border rounded-lg border p-4">
					<p className="text-muted-foreground text-xs font-semibold uppercase">
						Reason
					</p>
					<p className="text-foreground mt-1 text-sm">{user.suspensionReason}</p>
				</div>
			)}
		</div>
	);
};

export { SuspendedPage as default };
