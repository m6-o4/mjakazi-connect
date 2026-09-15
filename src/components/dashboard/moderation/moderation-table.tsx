"use client";

import { Ban, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { reinstateAccountAction, suspendAccountAction } from "@/app/actions/moderation";
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
import type { AccountRow } from "@/lib/account-rows";
import { notifySuccess } from "@/lib/notify";

type ModerationTableProps = {
	accounts: AccountRow[];
	canSuspend: boolean;
	canReinstate: boolean;
};

type PendingAction =
	| { type: "suspend"; userId: string; name: string }
	| { type: "reinstate"; userId: string; name: string };

const initials = (name: string): string =>
	name
		.split(" ")
		.filter(Boolean)
		.map((word) => word[0]?.toUpperCase())
		.join("")
		.slice(0, 2) || "?";

const ACTION_COPY: Record<
	PendingAction["type"],
	{
		title: string;
		description: string;
		confirm: string;
		variant: "default" | "destructive";
	}
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
};

// lists wajakazi or waajiri accounts with moderation actions only. suspend is
// available to staff and admin; reinstate is admin only. every action requires a
// reason. renaming and deletion live in the account sections
const ModerationTable = ({
	accounts,
	canSuspend,
	canReinstate,
}: ModerationTableProps) => {
	const router = useRouter();
	const [pending, setPending] = useState<PendingAction | null>(null);
	const [reason, setReason] = useState("");
	const [reasonError, setReasonError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const openAction = (action: PendingAction) => {
		setReason("");
		setReasonError(null);
		setPending(action);
	};

	const handleConfirm = async () => {
		const action = pending;
		if (!action) return;
		if (!reason.trim()) {
			setReasonError("A reason is required.");
			return;
		}

		setBusy(true);
		setReasonError(null);

		let result: { success: boolean; error?: string };
		if (action.type === "suspend") {
			result = await suspendAccountAction(action.userId, reason);
		} else {
			result = await reinstateAccountAction(action.userId, reason);
		}

		setBusy(false);
		if (!result.success) {
			setReasonError(result.error ?? "Could not complete the action.");
			return;
		}

		const suspended = action.type === "suspend";
		notifySuccess(suspended ? "Account suspended" : "Account reinstated", {
			id: `moderation-${action.userId}`,
			description: `${action.name} was ${suspended ? "suspended" : "reinstated"}.`,
		});
		setPending(null);
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
											<Badge variant={account.statusVariant}>{account.statusLabel}</Badge>
										</div>
										<p className="text-muted-foreground text-xs">{account.email}</p>
										{account.subtitle && (
											<p className="text-muted-foreground text-xs">{account.subtitle}</p>
										)}
									</div>
								</div>

								<div className="flex shrink-0 flex-wrap items-center gap-2">
									{isSuspended
										? canReinstate && (
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
										: canSuspend && (
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
								</div>
							</div>
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
						<AlertDialogTitle>
							{pending ? ACTION_COPY[pending.type].title : ""}
						</AlertDialogTitle>
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
