"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteAccountAction, updateAccountAction } from "@/app/actions/accounts";
import { EditNameForm } from "@/components/dashboard/admin/edit-name-form";
import {
	AlertDialog,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AccountRow } from "@/lib/account-rows";

type AccountsTableProps = {
	accounts: AccountRow[];
	canDelete: boolean;
};
const initials = (name: string): string =>
	name
		.split(" ")
		.filter(Boolean)
		.map((word) => word[0]?.toUpperCase())
		.join("")
		.slice(0, 2) || "?";

// lists a single account type for simple administration: inline name editing for
// staff and admin, and a full delete for admin only. moderation (suspend and
// reinstate) lives separately and stays reason-gated
const AccountsTable = ({ accounts, canDelete }: AccountsTableProps) => {
	const router = useRouter();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [pendingDelete, setPendingDelete] = useState<AccountRow | null>(null);
	const [busy, setBusy] = useState(false);
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

	const handleDelete = async () => {
		if (!pendingDelete) return;

		setBusy(true);
		setError(null);
		const result = await deleteAccountAction(pendingDelete.userId);
		setBusy(false);

		if (!result.success) {
			setError(result.error ?? "Could not delete the account.");
			return;
		}

		setPendingDelete(null);
		router.refresh();
	};

	if (accounts.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
				<p className="text-foreground text-base font-semibold">No accounts</p>
				<p className="text-muted-foreground mt-1 text-sm">Accounts will appear here.</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="bg-card border-border divide-border divide-y rounded-lg border">
				{accounts.map((account) => {
					const isEditing = editingId === account.userId;

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
									<div className="flex shrink-0 flex-wrap items-center gap-2">
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
												onClick={() => {
													setError(null);
													setPendingDelete(account);
												}}
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

			<AlertDialog
				open={pendingDelete !== null}
				onOpenChange={(open) => {
					if (!open && !busy) {
						setPendingDelete(null);
						setError(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Delete account?</AlertDialogTitle>
						<AlertDialogDescription>
							Everything belonging to this account — profile, documents, photos,
							subscription, payments and matching records — is removed and cannot be
							recovered.
							{pendingDelete && (
								<span className="text-foreground mt-2 block font-medium">
									{pendingDelete.name}
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>

					{error && <p className="text-destructive text-xs">{error}</p>}

					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
						<Button variant="destructive" onClick={handleDelete} disabled={busy}>
							{busy ? "Deleting..." : "Delete"}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export { AccountsTable };
