"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClerk } from "@clerk/nextjs";
import { AlertTriangle, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// the user must type this phrase to confirm deletion
const CONFIRMATION_PHRASE = "delete my account";

interface DeleteAccountCardProps {
	role: "mjakazi" | "mwajiri";
}

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
			const res = await fetch("/apis/profile/delete-account", {
				method: "DELETE",
			});

			if (res.ok) {
				// sign out from clerk and redirect to homepage
				await signOut(() => router.push("/"));
			} else {
				const data = await res.json();
				setError(data.error ?? "Failed to delete account. Please try again.");
				setLoading(false);
			}
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
						Permanently removes your account and all associated data from Mjakazi Connect.
						This action cannot be undone.
					</p>
				</div>
			</div>

			{/* what gets deleted */}
			<div className="bg-destructive/5 rounded-lg px-4 py-3">
				<p className="text-destructive mb-2 text-xs font-semibold tracking-wide uppercase">
					The following will be permanently deleted
				</p>
				<ul className="text-muted-foreground space-y-1 text-sm">
					<li>— Your account and sign-in credentials</li>
					{role === "mjakazi" && (
						<>
							<li>— Your worker profile and verification records</li>
							<li>
								— All uploaded documents including National ID and Certificate of Good
								Conduct
							</li>
							<li>— Your profile photo</li>
						</>
					)}
					{role === "mwajiri" && <li>— Your mwajiri profile</li>}
				</ul>
			</div>

			{!showConfirm ? (
				<Button
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
						<Label htmlFor="confirmText" className="text-xs">
							Type{" "}
							<span className="text-destructive font-semibold">
								{CONFIRMATION_PHRASE}
							</span>{" "}
							to confirm
						</Label>
						<Input
							id="confirmText"
							placeholder={CONFIRMATION_PHRASE}
							value={confirmText}
							onChange={(e) => setConfirmText(e.target.value)}
							className="border-destructive/30 focus:border-destructive focus:ring-destructive/20 text-sm"
						/>
					</div>

					<div className="flex gap-2">
						<Button
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
							variant="destructive"
							onClick={handleDelete}
							disabled={!isConfirmed || loading}
							className="flex-1 gap-2"
						>
							<Trash2 className="size-4" />
							{loading ? "Deleting..." : "Confirm Deletion"}
						</Button>
					</div>

					{error && <p className="text-destructive text-sm">{error}</p>}
				</div>
			)}
		</div>
	);
};

export { DeleteAccountCard };
