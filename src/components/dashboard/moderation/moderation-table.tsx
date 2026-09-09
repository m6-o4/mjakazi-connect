"use client";

import { Ban, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteAccountAction, updateAccountAction } from "@/app/actions/accounts";
import {
	reinstateAccountAction,
	suspendAccountAction,
} from "@/app/actions/moderation";
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
import { Textarea } from "@/components/ui/textarea";

type ModerationRow = {
	userId: string;
	name: string;
	firstName: string;
	lastName: string;
	email: string;
	statusLabel: string;
	statusVariant: "default" | "secondary" | "destructive" | "outline";
	subtitle: string | null;
	accountState: string;
	createdAt: string;
};

type ModerationTableProps = {
	accounts: ModerationRow[];
	canSuspend: boolean;
	canReinstate: boolean;
	canDelete: boolean;
};

type PendingAction =
	| { type: "suspend"; userId: string; name: string }
	| { type: "reinstate"; userId: string; name: string }
	| { type: "delete"; userId: string; name: string };

const initials = (name: string): string =>
	name
		.split(" ")
		.filter(Boolean)
		.map((word) => word[0]?.toUpperCase())
		.join("")
		.slice(0, 2) || "?";

const ACTION_COPY: Record<
	PendingAction["type"],
	{ title: string; description: string; confirm: string; variant: "default" | "destructive" }
> = {
	suspend: {
		title: "Suspend account?",
		description:
			"The user will be locked out and removed from the directory. This is reversible.",
		confirm: "Suspend",
		variant: "destructive",
	},
	reinstate: {
		title: "Reinstate account?",
		description: "The user regains access and returns to the directory if eligible.",
		confirm: "Reinstate",
		variant: "default",
	},
	delete: {
		title: "Delete account?",
		description:
			"All of the user's data is removed and cannot be recovered. Only do this after a warning and no sign of repentance.",
		confirm: "Delete",
		variant: "destructive",
	},
};

// lists wajakazi or waajiri accounts with moderation actions. suspend is
// available to staff and admin; reinstate and delete are admin only. every
// action requires a reason
const ModerationTable = ({
	accounts,
	canSuspend,
	canReinstate,
	canDelete,
}: ModerationTableProps) => {
	const router = useRouter();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [pending, setPending] = useState<PendingAction | null>(null);
	const [reason, setReason] = useState("");
	const [reasonError, setReasonError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const openAction = (action: PendingAction) => {
		setReason("");
		setReasonError(null);
		setPending(action);
	};

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

	const handleConfirm = async () => {
		if (!pending) return;
		if (!reason.trim()) {
			setReasonError("A reason is required.");
			return;
		}

		setBusy(true);
		setReasonError(null);

		let result: { success: boolean; error?: string };
		if (pending.type === "suspend") {
			result = await suspendAccountAction(pending.userId, reason);
		} else if (pending.type === "reinstate") {
			result = await reinstateAccountAction(pending.userId, reason);
		} else {
			result = await deleteAccountAction(pending.userId, reason);
		}

		setBusy(false);
		if (!result.success) {
			setReasonError(result.error ?? "Could not complete the action.");
			return;
		}

		setPending(null);
		router.refresh();
	};

	if (accounts.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
				<p className="text-foreground text-base font-semibold">No accounts</p>
				<p className="text-muted-foreground mt-1 text-sm">
					Accounts will appear here.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="bg-card border-border divide-border divide-y rounded-lg border">
				{accounts.map((account) => {
					const isEditing = editingId === account.userId;
					const isSuspended = account.accountState === "suspended";

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
											<Badge variant={account.statusVariant}>
												{account.statusLabel}
											</Badge>
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
										{isSuspended ? (
											canReinstate && (
												<Button
													size="sm"
													variant="outline"
													onClick={() =>
														openAction({
															type: "reinstate",
															userId: account.userId,
															name: account.name,
														})
													}
												>
													<RotateCcw />
													Reinstate
												</Button>
											)
										) : (
											<>
												{canSuspend && (
													<Button
														size="sm"
														variant="outline"
														className="text-destructive"
														onClick={() =>
															openAction({
																type: "suspend",
																userId: account.userId,
																name: account.name,
															})
														}
													>
														<Ban />
														Suspend
													</Button>
												)}
												{canDelete && (
													<Button
														size="sm"
														variant="ghost"
														className="text-destructive"
														onClick={() =>
															openAction({
																type: "delete",
																userId: account.userId,
																name: account.name,
															})
														}
													>
														<Trash2 />
														Delete
													</Button>
												)}
											</>
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
				open={pending !== null}
				onOpenChange={(open) => {
					if (!open && !busy) {
						setPending(null);
						setReason("");
						setReasonError(null);
					}
				}}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{pending ? ACTION_COPY[pending.type].title : ""}</AlertDialogTitle>
						<AlertDialogDescription>
							{pending ? ACTION_COPY[pending.type].description : ""}
							{pending && (
								<span className="text-foreground mt-2 block font-medium">
									{pending.name}
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>

					<div className="flex flex-col gap-2">
						<Textarea
							value={reason}
							onChange={(event) => {
								setReason(event.target.value);
								if (reasonError) setReasonError(null);
							}}
							placeholder="Reason (required)"
							aria-label="Reason"
						/>
						{reasonError && <p className="text-destructive text-xs">{reasonError}</p>}
					</div>

					<AlertDialogFooter>
						<AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
						<Button
							variant={pending ? ACTION_COPY[pending.type].variant : "default"}
							onClick={handleConfirm}
							disabled={busy}
						>
							{busy ? "Working..." : pending ? ACTION_COPY[pending.type].confirm : ""}
						</Button>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
};

export { ModerationTable };
export type { ModerationRow };
