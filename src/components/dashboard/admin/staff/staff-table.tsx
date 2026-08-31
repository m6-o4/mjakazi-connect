"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteStaffAction, updateStaffAction } from "@/app/actions/staff";
import { EditNameForm } from "@/components/dashboard/admin/edit-name-form";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StaffRecord } from "@/services/staff.service";

type StaffTableProps = {
	staff: StaffRecord[];
	currentUserId: string;
};

const initials = (firstName: string, lastName: string): string =>
	[firstName, lastName]
		.filter(Boolean)
		.map((name) => name[0]?.toUpperCase())
		.join("")
		.slice(0, 2) || "?";

// lists back-office accounts with inline name editing and a guarded delete. the
// signed-in admin's own row shows no destructive actions
const StaffTable = ({ staff, currentUserId }: StaffTableProps) => {
	const router = useRouter();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleSave = async (
		id: string,
		firstName: string,
		lastName: string,
	): Promise<string | null> => {
		const result = await updateStaffAction(id, { firstName, lastName });
		if (!result.success) return result.error ?? "Could not save.";
		setEditingId(null);
		router.refresh();
		return null;
	};

	const handleDelete = async (id: string) => {
		setDeletingId(id);
		setError(null);
		const result = await deleteStaffAction(id);
		if (!result.success) setError(result.error ?? "Could not delete.");
		setDeletingId(null);
		router.refresh();
	};

	if (staff.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
				<p className="text-foreground text-base font-semibold">No staff accounts yet</p>
				<p className="text-muted-foreground mt-1 text-sm">
					Create one with the form above.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{error && <p className="text-destructive text-sm">{error}</p>}

			<div className="bg-card border-border divide-border divide-y rounded-lg border">
				{staff.map((member) => {
					const isSelf = member.id === currentUserId;
					const isEditing = editingId === member.id;
					const isDeleting = deletingId === member.id;

					return (
						<div key={member.id} className="flex flex-col gap-3 p-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-3">
									<div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-full">
										<span className="text-primary text-xs font-bold">
											{initials(member.firstName, member.lastName)}
										</span>
									</div>
									<div>
										<div className="flex flex-wrap items-center gap-2">
											<p className="text-foreground text-sm font-semibold">
												{[member.firstName, member.lastName].filter(Boolean).join(" ")}
											</p>
											<Badge variant={member.role === "admin" ? "secondary" : "outline"}>
												{member.role === "admin" ? "Admin" : "Staff"}
											</Badge>
											{isSelf && <Badge variant="outline">You</Badge>}
										</div>
										<p className="text-muted-foreground text-xs">{member.email}</p>
									</div>
								</div>

								{!isSelf && !isEditing && (
									<div className="flex shrink-0 items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => setEditingId(member.id)}
										>
											<Pencil />
											Edit
										</Button>
										<Button
											size="sm"
											variant="ghost"
											className="text-destructive"
											onClick={() => setConfirmId(member.id)}
											disabled={isDeleting}
										>
											<Trash2 />
											Delete
										</Button>
									</div>
								)}
							</div>

							{isEditing && (
								<EditNameForm
									initialFirstName={member.firstName}
									initialLastName={member.lastName}
									onSave={(first, last) => handleSave(member.id, first, last)}
									onCancel={() => setEditingId(null)}
								/>
							)}
						</div>
					);
				})}
			</div>

			<AlertDialog
				open={confirmId !== null}
				onOpenChange={(open) => {
					if (!open) setConfirmId(null);
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete staff account?</AlertDialogTitle>
						<AlertDialogDescription>
							This removes the staff member and their sign-in. This cannot be undone.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							onClick={() => {
								const id = confirmId;
								setConfirmId(null);
								if (id) void handleDelete(id);
							}}
						>
							Delete
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export { StaffTable };
