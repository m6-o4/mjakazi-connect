import { ApproveAction } from "@/components/dashboard/accounts/approve-action";
import { DeleteUserAction } from "@/components/dashboard/accounts/delete-user-action";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, User } from "lucide-react";

interface WajakaziAccount {
	id: string;
	clerkId: string;
	displayName: string;
	email: string;
	verificationStatus: string;
	profileComplete: boolean;
	photoUrl: string | null;
	createdAt: string;
	// profileId is used to target the correct payload profile when approving
	profileId: string;
}

interface WajakaziAccountsTableProps {
	accounts: WajakaziAccount[];
	// viewerRole gates destructive actions — only super-admins can delete accounts
	viewerRole: "admin" | "sa";
}

// maps every possible verification status to a badge label and tailwind classes
// so rendering stays declarative rather than scattered across conditionals
const verificationBadgeMap: Record<string, { label: string; className: string }> = {
	draft: { label: "Draft", className: "border-border text-muted-foreground" },
	pending_payment: {
		label: "Pending Payment",
		className: "border-amber-300 text-amber-700 bg-amber-50",
	},
	pending_review: {
		label: "Pending Review",
		className: "border-primary/30 text-primary bg-primary/5",
	},
	verified: {
		label: "Verified",
		className: "border-accent/30 text-accent bg-accent/10",
	},
	rejected: {
		label: "Rejected",
		className: "border-destructive/30 text-destructive bg-destructive/5",
	},
	verification_expired: {
		label: "Expired",
		className: "border-destructive/30 text-destructive bg-destructive/5",
	},
	blacklisted: {
		label: "Blacklisted",
		className: "border-destructive text-destructive bg-destructive/10",
	},
	deactivated: {
		label: "Deactivated",
		className: "border-border text-muted-foreground bg-muted/40",
	},
};

const WajakaziAccountsTable = ({ accounts, viewerRole }: WajakaziAccountsTableProps) => {
	// show a friendly empty state instead of an empty container
	if (accounts.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center">
				<div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-2xl">
					<User className="text-muted-foreground size-6" />
				</div>
				<p className="font-display text-foreground text-base font-semibold">
					No Wajakazi accounts
				</p>
				<p className="text-muted-foreground mt-1 text-sm">
					Registered workers will appear here.
				</p>
			</div>
		);
	}

	return (
		<div className="bg-card border-border overflow-hidden rounded-xl border">
			{/* header summarises how many workers are currently registered */}
			<div className="border-border border-b px-6 py-4">
				<p className="font-display text-foreground text-base font-semibold">
					Wajakazi Accounts
				</p>
				<p className="text-muted-foreground mt-0.5 text-sm">
					{accounts.length} worker
					{accounts.length !== 1 ? "s" : ""} registered
				</p>
			</div>

			<div className="divide-border divide-y">
				{accounts.map((account) => {
					// fall back to "draft" styling when an unknown status arrives
					const badge =
						verificationBadgeMap[account.verificationStatus] ??
						verificationBadgeMap.draft;

					// approval is only meaningful when a worker is awaiting review
					const canApprove = account.verificationStatus === "pending_review";
					// hard deletion is restricted to super-admins to prevent accidental data loss
					const canDelete = viewerRole === "sa";

					return (
						<div
							key={account.id}
							className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
						>
							{/* identity — photo with initials fallback, name, email, join date */}
							<div className="flex items-center gap-3">
								<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full">
									{account.photoUrl ? (
										<img
											src={account.photoUrl}
											alt={account.displayName}
											className="h-full w-full object-cover"
										/>
									) : (
										// derive initials from the display name when no photo is available
										<span className="text-primary text-xs font-bold">
											{account.displayName
												.split(" ")
												.map((n) => n[0])
												.join("")
												.slice(0, 2)
												.toUpperCase()}
										</span>
									)}
								</div>
								<div>
									<p className="text-foreground text-sm font-semibold">
										{account.displayName}
									</p>
									<p className="text-muted-foreground text-xs">{account.email}</p>
									<p className="text-muted-foreground text-xs">
										Joined{" "}
										{new Date(account.createdAt).toLocaleDateString("en-KE", {
											day: "numeric",
											month: "short",
											year: "numeric",
										})}
									</p>
								</div>
							</div>

							{/* status badges and context-sensitive action buttons */}
							<div className="flex shrink-0 flex-wrap items-center gap-2">
								<Badge variant="outline" className={`text-xs ${badge.className}`}>
									{badge.label}
								</Badge>

								{/* profile-complete badge signals the worker has filled all required fields */}
								{account.profileComplete && (
									<Badge
										variant="outline"
										className="border-accent/30 bg-accent/5 text-accent text-xs"
									>
										<ShieldCheck className="mr-1 size-3" />
										Profile Complete
									</Badge>
								)}

								{canApprove && <ApproveAction profileId={account.profileId} />}

								{canDelete && (
									<DeleteUserAction
										clerkId={account.clerkId}
										role="mjakazi"
										displayName={account.displayName}
									/>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export { WajakaziAccountsTable };
