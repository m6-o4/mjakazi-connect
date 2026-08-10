import { AuditLogTable } from "@/components/dashboard/sa/audit-log-table";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import type { Where } from "payload";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Audit Logs" };

interface AuditLogsPageProps {
	searchParams: Promise<{
		action?: string;
		source?: string;
		page?: string;
	}>;
}

const Page = async ({ searchParams }: AuditLogsPageProps) => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// restrict access to administrative roles only
	if (!identity) redirect("/sign-in");
	if (identity.role !== "sa" && identity.role !== "admin") redirect("/sign-in");

	const { action, source, page } = await searchParams;
	const currentPage = Math.max(1, parseInt(page ?? "1", 10));
	const limit = 25;

	// dynamically construct query conditions to exclude inactive filters
	const conditions: Where[] = [];

	if (action && action !== "all") {
		conditions.push({ action: { equals: action } });
	}

	if (source && source !== "all") {
		conditions.push({ source: { equals: source } });
	}

	const where: Where = conditions.length > 0 ? { and: conditions } : {};

	// fetch logs with system-level access to bypass collection-level restrictions
	const logs = await payload.find({
		collection: "audit-logs",
		where,
		overrideAccess: true,
		sort: "-createdAt",
		limit,
		page: currentPage,
	});

	return (
		<>
			<DashboardTopbar title="Audit Logs" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<AuditLogTable
					logs={logs.docs}
					totalDocs={logs.totalDocs}
					totalPages={logs.totalPages}
					currentPage={currentPage}
					hasNextPage={logs.hasNextPage}
					hasPrevPage={logs.hasPrevPage}
				/>
			</main>
		</>
	);
};

export { Page as default };
