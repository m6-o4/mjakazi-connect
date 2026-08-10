"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface StaffMember {
	id: string;
	clerkId: string;
	firstName: string;
	lastName: string;
	email: string;
	role: "admin" | "sa";
	createdAt: string;
}

interface StaffTableProps {
	staff: StaffMember[];
	// used to identify the current user so their row cannot show a delete action
	currentUserClerkId: string;
}

// mapping for internal role codes to display labels
const roleLabels: Record<string, string> = {
	admin: "Admin",
	sa: "Super Admin",
};

// table display and management for staff members
const StaffTable = ({ staff, currentUserClerkId }: StaffTableProps) => {
	const router = useRouter();
	// tracks loading state during deletion
	const [deletingId, setDeletingId] = useState<string | null>(null);
	// tracks row currently in confirm-delete state
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleDelete = async (clerkId: string) => {
		setDeletingId(clerkId);
		setError(null);

		try {
			// request to internal admin api
			const res = await fetch("/apis/admin/delete-staff", {
				method: "DELETE",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ clerkId }),
			});

			if (res.ok) {
				// clear confirmation and refresh for updated list
				setConfirmId(null);
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Failed to delete account.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setDeletingId(null);
		}
	};

	if (staff.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center">
				<p className="font-display text-foreground text-base font-semibold">
					No staff accounts
				</p>
				<p className="text-muted-foreground mt-1 text-sm">
					Create an admin account using the form above.
				</p>
			</div>
		);
	}

	return (
		<div className="bg-card border-border overflow-hidden rounded-xl border">
			<div className="border-border border-b px-6 py-4">
				<p className="font-display text-foreground text-base font-semibold">
					Staff Accounts
				</p>
				<p className="text-muted-foreground mt-0.5 text-sm">
					{staff.length} account{staff.length !== 1 ? "s" : ""} on the platform
				</p>
			</div>

			{/* surface the last api error above the list so it's immediately visible */}
			{error && (
				<div className="border-border bg-destructive/5 border-b px-6 py-3">
					<div className="flex items-center gap-2">
						<AlertCircle className="text-destructive h-4 w-4" />
						<p className="text-destructive text-sm">{error}</p>
					</div>
				</div>
			)}

			<div className="divide-border divide-y">
				{staff.map((member) => {
					const isSelf = member.clerkId === currentUserClerkId;
					const isConfirming = confirmId === member.clerkId;
					const isDeleting = deletingId === member.clerkId;

					return (
						<div
							key={member.id}
							className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
						>
							{/* member info */}
							<div className="flex items-center gap-3">
								{/* avatar built from initials — no image upload required */}
								<div className="bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
									<span className="text-primary text-xs font-bold">
										{[member.firstName, member.lastName]
											.filter(Boolean)
											.map((n) => n[0].toUpperCase())
											.join("")
											.slice(0, 2)}
									</span>
								</div>
								<div>
									<div className="flex items-center gap-2">
										<p className="text-foreground text-sm font-semibold">
											{member.firstName} {member.lastName}
										</p>
										<Badge
											variant="outline"
											className={
												member.role === "sa"
													? "border-primary/30 text-primary text-xs"
													: "text-xs"
											}
										>
											{roleLabels[member.role]}
										</Badge>
										{/* visually marks the signed-in user's own row */}
										{isSelf && (
											<Badge variant="outline" className="text-muted-foreground text-xs">
												You
											</Badge>
										)}
									</div>
									<p className="text-muted-foreground text-xs">{member.email}</p>
									<p className="text-muted-foreground text-xs">
										Added{" "}
										{new Date(member.createdAt).toLocaleDateString("en-KE", {
											day: "numeric",
											month: "short",
											year: "numeric",
										})}
									</p>
								</div>
							</div>

							{/* actions — hidden for the current user to prevent self-deletion */}
							<div className="flex shrink-0 items-center gap-2">
								{!isSelf && (
									<>
										{/* two-step confirmation prevents accidental deletes */}
										{isConfirming ? (
											<>
												<p className="text-muted-foreground text-xs">Are you sure?</p>
												<Button
													size="sm"
													variant="destructive"
													onClick={() => handleDelete(member.clerkId)}
													disabled={isDeleting}
												>
													{isDeleting ? "Deleting..." : "Confirm"}
												</Button>
												<Button
													size="sm"
													variant="outline"
													onClick={() => setConfirmId(null)}
													disabled={isDeleting}
												>
													Cancel
												</Button>
											</>
										) : (
											<Button
												size="sm"
												variant="outline"
												onClick={() => setConfirmId(member.clerkId)}
												className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive gap-1.5"
											>
												<Trash2 className="size-3.5" />
												Delete
											</Button>
										)}
									</>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};

export { StaffTable };
