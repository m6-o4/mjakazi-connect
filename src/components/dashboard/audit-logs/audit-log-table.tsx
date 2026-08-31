"use client";

import { ShieldQuestion } from "lucide-react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { AuditLog } from "@/payload-types";

type AuditLogTableProps = {
	logs: AuditLog[];
	totalDocs: number;
	totalPages: number;
	currentPage: number;
	currentAction: string;
	currentSource: string;
	hasNextPage: boolean;
	hasPrevPage: boolean;
};

// raw action codes → human labels. kept in one place so the filter and the rows
// can never disagree
const ACTION_LABELS: Record<string, string> = {
	account_created: "Account created",
	account_updated: "Account updated",
	account_deleted: "Account deleted",
	verification_submitted: "Verification submitted",
	verification_approved: "Verification approved",
	verification_rejected: "Verification rejected",
	payment_initiated: "Payment initiated",
	payment_confirmed: "Payment confirmed",
	payment_failed: "Payment failed",
	payment_expired: "Payment expired",
	eoi_sent: "Expression of interest sent",
	document_uploaded: "Document uploaded",
	document_deleted: "Document deleted",
	document_viewed: "Document viewed",
};

// tone per action — destructive for deletions/rejections, primary for the
// positive transitions, neutral for reads
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
	eoi_sent: "secondary",
	document_uploaded: "secondary",
	document_deleted: "destructive",
	document_viewed: "outline",
};

const formatDate = (iso: string) =>
	new Date(iso).toLocaleString("en-KE", {
		day: "2-digit",
		month: "short",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});

// flattens the event metadata into a compact "key: value · key: value" line
const formatMetadata = (metadata: unknown): string | null => {
	if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
	const entries = Object.entries(metadata as Record<string, unknown>);
	if (entries.length === 0) return null;
	return entries
		.map(([key, value]) => {
			const rendered =
				typeof value === "object" && value !== null
					? JSON.stringify(value)
					: String(value);
			return `${key}: ${rendered}`;
		})
		.join(" · ");
};

const AuditLogTable = ({
	logs,
	totalDocs,
	totalPages,
	currentPage,
	currentAction,
	currentSource,
	hasNextPage,
	hasPrevPage,
}: AuditLogTableProps) => {
	const router = useRouter();

	const updateParam = (key: string, value: string) => {
		let action = currentAction;
		let source = currentSource;
		let page = currentPage;

		if (key === "action") {
			action = value;
			page = 1;
		} else if (key === "source") {
			source = value;
			page = 1;
		} else if (key === "page") {
			page = Number(value);
		}

		const params = new URLSearchParams();
		if (action !== "all") params.set("action", action);
		if (source !== "all") params.set("source", source);
		if (page > 1) params.set("page", String(page));

		const query = params.toString();
		router.push(query ? `?${query}` : "/dashboard/audit-logs");
	};

	return (
		<div className="flex flex-col gap-4">
			<div className="flex flex-wrap items-center gap-3">
				<Select
					value={currentAction}
					onValueChange={(value) => updateParam("action", value ?? "all")}
				>
					<SelectTrigger className="w-56">
						<SelectValue placeholder="All actions" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All actions</SelectItem>
						{Object.entries(ACTION_LABELS).map(([value, label]) => (
							<SelectItem key={value} value={value}>
								{label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={currentSource}
					onValueChange={(value) => updateParam("source", value ?? "all")}
				>
					<SelectTrigger className="w-40">
						<SelectValue placeholder="All sources" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All sources</SelectItem>
						<SelectItem value="user">User</SelectItem>
						<SelectItem value="system">System</SelectItem>
					</SelectContent>
				</Select>

				<p className="text-muted-foreground ml-auto text-sm">
					{totalDocs} {totalDocs === 1 ? "entry" : "entries"}
				</p>
			</div>

			{logs.length === 0 ? (
				<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
					<ShieldQuestion className="text-muted-foreground mb-3 size-6" />
					<p className="text-foreground text-base font-semibold">No log entries found</p>
					<p className="text-muted-foreground mt-1 text-sm">
						Try a different filter, or events will appear here as they happen.
					</p>
				</div>
			) : (
				<div className="bg-card border-border divide-border divide-y rounded-lg border">
					{logs.map((log) => {
						const metadata = formatMetadata(log.metadata);
						return (
							<div
								key={log.id}
								className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="flex flex-col gap-1.5">
									<div className="flex flex-wrap items-center gap-2">
										<Badge variant={ACTION_VARIANT[log.action] ?? "outline"}>
											{ACTION_LABELS[log.action] ?? log.action}
										</Badge>
										<span className="text-muted-foreground text-xs">
											{formatDate(log.createdAt)}
										</span>
									</div>
									<p className="text-foreground text-sm">
										<span className="font-medium">{log.actorLabel ?? "System"}</span>
										{log.targetLabel ? (
											<>
												<span className="text-muted-foreground"> → </span>
												<span className="font-medium">{log.targetLabel}</span>
											</>
										) : null}
									</p>
									{metadata && (
										<p className="text-muted-foreground text-xs">{metadata}</p>
									)}
								</div>
								<Badge variant="outline" className="w-fit text-xs capitalize">
									{log.source}
								</Badge>
							</div>
						);
					})}
				</div>
			)}

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
