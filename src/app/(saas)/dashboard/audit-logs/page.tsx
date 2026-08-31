import { redirect } from "next/navigation";
import { getPayload, type Where } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { AuditLogTable } from "@/components/dashboard/audit-logs/audit-log-table";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";

export const metadata = { title: "Audit Logs" };

type Args = {
	searchParams: Promise<{ action?: string; source?: string; page?: string }>;
};

const AuditLogsPage = async ({ searchParams }: Args) => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const { action, source, page } = await searchParams;
	const currentAction = action ?? "all";
	const currentSource = source ?? "all";
	const currentPage = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
	const limit = 25;

	const conditions: Where[] = [];
	if (currentAction !== "all") {
		conditions.push({ action: { equals: currentAction } });
	}
	if (currentSource !== "all") {
		conditions.push({ source: { equals: currentSource } });
	}
	const where: Where = conditions.length > 0 ? { and: conditions } : {};

	const payload = await getPayload({ config });
	const result = await payload.find({
		collection: "audit-logs",
		where,
		sort: "-createdAt",
		limit,
		page: currentPage,
		select: {
			id: true,
			action: true,
			actorLabel: true,
			targetLabel: true,
			metadata: true,
			source: true,
			createdAt: true,
		},
		overrideAccess: false,
		req: { user },
	});

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Audit logs</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					A read-only record of every significant platform event.
				</p>
			</div>

			<AuditLogTable
				logs={result.docs}
				totalDocs={result.totalDocs}
				totalPages={result.totalPages}
				currentPage={currentPage}
				currentAction={currentAction}
				currentSource={currentSource}
				hasNextPage={result.hasNextPage}
				hasPrevPage={result.hasPrevPage}
			/>
		</div>
	);
};

export { AuditLogsPage as default };
