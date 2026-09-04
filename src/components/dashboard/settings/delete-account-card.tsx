"use client";

import { useClerk } from "@clerk/nextjs";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { deleteOwnAccountAction } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// the user must type this phrase to confirm deletion
const CONFIRMATION_PHRASE = "delete my account";

type DeleteAccountCardProps = {
	role: "mjakazi" | "mwajiri";
};

// permanently deletes the account and all associated data. the type-to-confirm
// guard makes the destructive action deliberate; on success the caller is signed
// out of clerk and returned home
const DeleteAccountCard = ({ role }: DeleteAccountCardProps) => {
	const router = useRouter();
	const { signOut } = useClerk();
	const [showConfirm, setShowConfirm] = useState(false);
	const [confirmText, setConfirmText] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const isConfirmed = confirmText.toLowerCase() === CONFIRMATION_PHRASE;

	const handleDelete = async () => {
		if (!isConfirmed) return;

		setLoading(true);
		setError(null);

		try {
			const result = await deleteOwnAccountAction();
			if (!result.success) {
				setError(result.error ?? "Failed to delete account. Please try again.");
				setLoading(false);
				return;
			}

			await signOut(() => router.push("/"));
		} catch {
			setError("Network error. Please try again.");
			setLoading(false);
		}
	};

	return (
		<div className="border-destructive/30 bg-card flex flex-col gap-4 rounded-xl border p-6">
			<div className="flex items-start gap-3">
				<AlertTriangle className="text-destructive mt-0.5 h-5 w-5 shrink-0" />
				<div>
					<p className="text-foreground text-sm font-semibold">Delete Account</p>
					<p className="text-muted-foreground mt-1 text-sm">
						Permanently removes your account and all associated data from Mjakazi
						Connect. This action cannot be undone.
					</p>
				</div>
			</div>

			<div className="bg-destructive/5 rounded-lg px-4 py-3">
				<p className="text-destructive mb-2 text-xs font-semibold tracking-wide uppercase">
					The following will be permanently deleted
				</p>
				<ul className="text-muted-foreground space-y-1 text-sm">
					<li>— Your account and sign-in credentials</li>
					{role === "mjakazi" ? (
						<>
							<li>— Your worker profile and verification records</li>
							<li>
								— All uploaded documents including National ID and Certificate of
								Good Conduct
							</li>
							<li>— Your profile photo</li>
						</>
					) : (
						<>
							<li>— Your employer profile and subscription</li>
							<li>— Your payment history</li>
						</>
					)}
				</ul>
			</div>

			{!showConfirm ? (
				<Button
					type="button"
					variant="outline"
					onClick={() => setShowConfirm(true)}
					className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive w-full gap-2"
				>
					<Trash2 className="size-4" />
					Delete My Account
				</Button>
			) : (
				<div className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="confirm-delete" className="text-xs">
							Type{" "}
							<span className="text-destructive font-semibold">{CONFIRMATION_PHRASE}</span>{" "}
							to confirm
						</Label>
						<Input
							id="confirm-delete"
							placeholder={CONFIRMATION_PHRASE}
							value={confirmText}
							onChange={(event) => setConfirmText(event.target.value)}
							className="border-destructive/30 focus:border-destructive focus:ring-destructive/20 text-sm"
						/>
					</div>

					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={() => {
								setShowConfirm(false);
								setConfirmText("");
								setError(null);
							}}
							disabled={loading}
							className="flex-1"
						>
							Cancel
						</Button>
						<Button
							type="button"
							variant="destructive"
							onClick={handleDelete}
							disabled={!isConfirmed || loading}
							className="flex-1 gap-2"
						>
							<Trash2 className="size-4" />
							{loading ? "Deleting..." : "Confirm Deletion"}
						</Button>
					</div>

					{error ? <p className="text-destructive text-sm">{error}</p> : null}
				</div>
			)}
		</div>
	);
};

export { DeleteAccountCard };
