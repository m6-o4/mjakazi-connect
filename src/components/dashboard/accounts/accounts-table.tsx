"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteAccountAction, updateAccountAction } from "@/app/actions/accounts";
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

type AccountRow = {
	userId: string;
	name: string;
	firstName: string;
	lastName: string;
	email: string;
	statusLabel: string;
	statusVariant: "default" | "secondary" | "destructive" | "outline";
	subtitle: string | null;
	createdAt: string;
};

type AccountsTableProps = {
	accounts: AccountRow[];
	canDelete: boolean;
	deleteDescription: string;
};

const initials = (name: string): string =>
	name
		.split(" ")
		.filter(Boolean)
		.map((word) => word[0]?.toUpperCase())
		.join("")
		.slice(0, 2) || "?";

// lists SaaS accounts (wajakazi or waajiri) with inline name editing and a
// delete that is only offered to admin
const AccountsTable = ({
	accounts,
	canDelete,
	deleteDescription,
}: AccountsTableProps) => {
	const router = useRouter();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [confirmId, setConfirmId] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const handleSave = async (
		userId: string,
		firstName: string,
		lastName: string,
	): Promise<string | null> => {
		const result = await updateAccountAction(userId, { firstName, lastName });
		if (!result.success) return result.error ?? "Could not save.";
		setEditingId(null);
		router.refresh();
		return null;
	};

	const handleDelete = async (userId: string) => {
		setDeletingId(userId);
		setError(null);
		const result = await deleteAccountAction(userId);
		if (!result.success) setError(result.error ?? "Could not delete.");
		setDeletingId(null);
		router.refresh();
	};

	if (accounts.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
				<p className="text-foreground text-base font-semibold">No accounts yet</p>
				<p className="text-muted-foreground mt-1 text-sm">
					Registered accounts will appear here.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			{error && <p className="text-destructive text-sm">{error}</p>}

			<div className="bg-card border-border divide-border divide-y rounded-lg border">
				{accounts.map((account) => {
					const isEditing = editingId === account.userId;
					const isDeleting = deletingId === account.userId;

					return (
						<div key={account.userId} className="flex flex-col gap-3 p-4">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
								<div className="flex items-center gap-3">
									<div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-full">
										<span className="text-primary text-xs font-bold">
											{initials(account.name)}
										</span>
									</div>
									<div>
										<div className="flex flex-wrap items-center gap-2">
											<p className="text-foreground text-sm font-semibold">
												{account.name}
											</p>
											<Badge variant={account.statusVariant}>{account.statusLabel}</Badge>
										</div>
										<p className="text-muted-foreground text-xs">{account.email}</p>
										{account.subtitle && (
											<p className="text-muted-foreground text-xs">{account.subtitle}</p>
										)}
									</div>
								</div>

								{!isEditing && (
									<div className="flex shrink-0 items-center gap-2">
										<Button
											size="sm"
											variant="outline"
											onClick={() => setEditingId(account.userId)}
										>
											<Pencil />
											Edit
										</Button>
										{canDelete && (
											<Button
												size="sm"
												variant="ghost"
												className="text-destructive"
												onClick={() => setConfirmId(account.userId)}
												disabled={isDeleting}
											>
												<Trash2 />
												Delete
											</Button>
										)}
									</div>
								)}
							</div>

							{isEditing && (
								<EditNameForm
									initialFirstName={account.firstName}
									initialLastName={account.lastName}
									onSave={(first, last) => handleSave(account.userId, first, last)}
									onCancel={() => setEditingId(null)}
								/>
							)}
						</div>
					);
				})}
			</div>

			{canDelete && (
				<AlertDialog
					open={confirmId !== null}
					onOpenChange={(open) => {
						if (!open) setConfirmId(null);
					}}
				>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>Delete account?</AlertDialogTitle>
							<AlertDialogDescription>{deleteDescription}</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel>Cancel</AlertDialogCancel>
							<AlertDialogAction
								variant="destructive"
								onClick={() => {
									const userId = confirmId;
									setConfirmId(null);
									if (userId) void handleDelete(userId);
								}}
							>
								Delete
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			)}
		</div>
	);
};

export { AccountsTable };
export type { AccountRow };
