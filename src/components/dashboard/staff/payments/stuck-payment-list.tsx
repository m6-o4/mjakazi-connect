"use client";

import { CheckCircle2, Inbox } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { reconcilePaymentAction } from "@/app/actions/payment";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { notifyError, notifySuccess } from "@/lib/notify";

type StuckPaymentItem = {
	id: string;
	paymentType: string;
	amount: number;
	phoneNumber: string | null;
	mpesaReference: string;
	payerName: string | null;
	initiatedAt: string | null;
};

type StuckPaymentListProps = {
	items: StuckPaymentItem[];
};

// money is integer KSh, so a plain thousands-separated format is enough
const formatKsh = (value: number): string => `KSh ${value.toLocaleString("en-KE")}`;

const formatWhen = (value: string): string =>
	new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Africa/Nairobi",
	}).format(new Date(value));

// the payments a lost callback stranded: pushed to a handset, never confirmed,
// never failed. completing one is a money action, so it asks for the receipt from
// the customer's own M-Pesa SMS — the only proof the money moved, and the one
// thing m-pesa's status query can never supply. the server re-checks the role, the
// receipt format and the in-flight status, so nothing here is trusted
const StuckPaymentList = ({ items }: StuckPaymentListProps) => {
	const [confirming, setConfirming] = useState<string | null>(null);
	const [receipt, setReceipt] = useState("");
	const [busy, setBusy] = useState<string | null>(null);
	const [errors, setErrors] = useState<Record<string, string>>({});

	const router = useRouter();

	const confirm = async (paymentId: string) => {
		setBusy(paymentId);
		setErrors((prev) => ({ ...prev, [paymentId]: "" }));

		try {
			const result = await reconcilePaymentAction({
				paymentId,
				mpesaReceiptNumber: receipt,
			});

			if (!result.success) {
				setErrors((prev) => ({
					...prev,
					[paymentId]: result.error ?? "Could not confirm the payment.",
				}));
				return;
			}

			setConfirming(null);
			setReceipt("");
			notifySuccess("Payment confirmed", {
				id: "payment-reconciled",
				description: "The customer has been moved on and can continue.",
			});
			router.refresh();
		} catch {
			notifyError("Could not confirm the payment", {
				id: "payment-reconciled",
			});
		} finally {
			setBusy(null);
		}
	};

	if (items.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-lg border p-12 text-center">
				<Inbox className="text-muted-foreground size-6" />
				<p className="text-foreground mt-3 text-base font-semibold">Nothing waiting</p>
				<p className="text-muted-foreground mt-1 text-sm">
					No payment is waiting on a confirmation from us right now.
				</p>
			</div>
		);
	}

	return (
		<div className="bg-card border-border divide-border divide-y rounded-lg border">
			{items.map((item) => (
				<div
					key={item.id}
					className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
				>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<p className="text-foreground text-sm font-semibold">
								{item.payerName ?? "Unknown payer"}
							</p>
							<Badge variant="secondary" className="capitalize">
								{item.paymentType}
							</Badge>
							<span className="text-foreground text-sm font-medium">
								{formatKsh(item.amount)}
							</span>
						</div>
						<p className="text-muted-foreground mt-1 truncate text-xs">
							{item.phoneNumber ?? "No phone on the record"} &bull; Ref{" "}
							{item.mpesaReference}
							{item.initiatedAt ? ` • Sent ${formatWhen(item.initiatedAt)}` : ""}
						</p>
						{errors[item.id] ? (
							<p className="text-destructive mt-1 text-xs">{errors[item.id]}</p>
						) : null}
					</div>

					<div className="shrink-0">
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={busy === item.id}
							onClick={() => {
								setReceipt("");
								setConfirming(item.id);
							}}
						>
							<CheckCircle2 className="size-4" />
							Confirm with receipt
						</Button>

						<AlertDialog
							open={confirming === item.id}
							onOpenChange={(open) => {
								if (!open) setConfirming(null);
							}}
						>
							<AlertDialogContent>
								<AlertDialogHeader>
									<AlertDialogTitle>Confirm this payment?</AlertDialogTitle>
									<AlertDialogDescription>
										Only do this if the customer&apos;s own M-Pesa SMS shows the money
										left their account. Ask them to read out the receipt code, and type it
										exactly as it appears.
									</AlertDialogDescription>
								</AlertDialogHeader>

								<div className="flex flex-col gap-1.5">
									<Label htmlFor={`receipt-${item.id}`}>M-Pesa receipt</Label>
									<Input
										id={`receipt-${item.id}`}
										value={receipt}
										autoComplete="off"
										placeholder="e.g. UIL0W6W3XX"
										onChange={(event) => setReceipt(event.target.value)}
									/>
								</div>

								<AlertDialogFooter>
									<AlertDialogCancel>Cancel</AlertDialogCancel>
									<AlertDialogAction
										disabled={busy === item.id || receipt.trim().length === 0}
										onClick={() => {
											void confirm(item.id);
										}}
									>
										{busy === item.id ? "Confirming..." : "Confirm payment"}
									</AlertDialogAction>
								</AlertDialogFooter>
							</AlertDialogContent>
						</AlertDialog>
					</div>
				</div>
			))}
		</div>
	);
};

export { StuckPaymentList };
export type { StuckPaymentItem };
