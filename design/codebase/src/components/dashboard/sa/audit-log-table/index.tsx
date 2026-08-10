"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { AuditLog } from "@/payload-types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

interface AuditLogTableProps {
	logs: AuditLog[];
	totalDocs: number;
	totalPages: number;
	currentPage: number;
	hasNextPage: boolean;
	hasPrevPage: boolean;
}

// map raw database keys to human-readable labels for the ui
const ACTION_LABELS: Record<string, string> = {
	account_created: "Account Created",
	account_updated: "Account Updated",
	account_deleted: "Account Deleted",
	verification_submitted: "Verification Submitted",
	verification_approved: "Verification Approved",
	verification_rejected: "Verification Rejected",
	payment_initiated: "Payment Initiated",
	payment_confirmed: "Payment Confirmed",
	payment_failed: "Payment Failed",
	payment_expired: "Payment Expired",
};

// determine badge styling based on the severity or type of action
const ACTION_VARIANT: Record<
	string,
	"default" | "secondary" | "destructive" | "outline"
> = {
	account_created: "default",
	account_updated: "secondary",
	account_deleted: "destructive",
	verification_submitted: "secondary",
	verification_approved: "default",
	verification_rejected: "destructive",
	payment_initiated: "secondary",
	payment_confirmed: "default",
	payment_failed: "destructive",
	payment_expired: "outline",
};

// localize timestamps to kenyan standard for consistent regional reporting
const formatDate = (iso: string) => {
	return new Date(iso).toLocaleString("en-KE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
};

const AuditLogTable = ({
	logs,
	totalDocs,
	totalPages,
	currentPage,
	hasNextPage,
	hasPrevPage,
}: AuditLogTableProps) => {
	const router = useRouter();
	const searchParams = useSearchParams();

	// synchronize local filter state with the url to support deep linking and browser history
	const updateParam = useCallback(
		(key: string, value: string) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set(key, value);
			// reset to first page when changing filters to prevent out-of-bounds errors
			if (key !== "page") params.set("page", "1");
			router.push(`?${params.toString()}`);
		},
		[router, searchParams],
	);

	const currentAction = searchParams.get("action") ?? "all";
	const currentSource = searchParams.get("source") ?? "all";

	return (
		<div className="flex flex-col gap-4">
			{/* filter controls */}
			<div className="flex flex-wrap items-center gap-3">
				<Select value={currentAction} onValueChange={(val) => updateParam("action", val)}>
					<SelectTrigger className="w-52">
						<SelectValue placeholder="Filter by action" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Actions</SelectItem>
						{Object.entries(ACTION_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select value={currentSource} onValueChange={(val) => updateParam("source", val)}>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="Filter by source" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Sources</SelectItem>
						<SelectItem value="user">User</SelectItem>
						<SelectItem value="system">System</SelectItem>
					</SelectContent>
				</Select>

				<p className="text-muted-foreground ml-auto text-sm">
					{totalDocs} {totalDocs === 1 ? "entry" : "entries"}
				</p>
			</div>

			{/* data grid */}
			<div className="border-border rounded-xl border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-44">When</TableHead>
							<TableHead className="w-52">Action</TableHead>
							<TableHead>Actor</TableHead>
							<TableHead>Target</TableHead>
							<TableHead className="w-24">Source</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{logs.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={5}
									className="text-muted-foreground py-16 text-center text-sm"
								>
									No audit log entries found.
								</TableCell>
							</TableRow>
						) : (
							logs.map((log) => (
								<TableRow key={log.id}>
									<TableCell className="text-muted-foreground text-xs">
										{formatDate(log.createdAt)}
									</TableCell>
									<TableCell>
										<Badge variant={ACTION_VARIANT[log.action] ?? "outline"}>
											{ACTION_LABELS[log.action] ?? log.action}
										</Badge>
									</TableCell>
									<TableCell className="text-sm">{log.actorLabel ?? "—"}</TableCell>
									<TableCell className="text-sm">{log.targetLabel ?? "—"}</TableCell>
									<TableCell>
										<Badge variant="outline" className="text-xs capitalize">
											{log.source}
										</Badge>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* pagination navigation */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-sm">
						Page {currentPage} of {totalPages}
					</p>
					<div className="flex gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={!hasPrevPage}
							onClick={() => updateParam("page", String(currentPage - 1))}
						>
							Previous
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={!hasNextPage}
							onClick={() => updateParam("page", String(currentPage + 1))}
						>
							Next
						</Button>
					</div>
				</div>
			)}
		</div>
	);
};

export { AuditLogTable };
