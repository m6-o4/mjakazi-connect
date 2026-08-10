"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, UserCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NameUpdateFormProps {
	currentFirstName: string;
	currentLastName: string;
}

const NameUpdateForm = ({ currentFirstName, currentLastName }: NameUpdateFormProps) => {
	const router = useRouter();
	const [firstName, setFirstName] = useState(currentFirstName);
	const [lastName, setLastName] = useState(currentLastName);
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSave = async () => {
		if (!firstName.trim()) {
			setError("First name is required.");
			return;
		}

		setLoading(true);
		setError(null);
		setSuccess(false);

		try {
			const res = await fetch("/apis/admin/update-profile", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					firstName: firstName.trim(),
					lastName: lastName.trim(),
				}),
			});

			if (res.ok) {
				setSuccess(true);
				// refresh so the sidebar picks up the new name from clerk
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Failed to save. Please try again.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="bg-card border-border flex flex-col gap-4 rounded-xl border p-6">
			<div>
				<p className="text-muted-foreground text-sm font-semibold">Your Name</p>
				<p className="text-muted-foreground text-sm">
					Update your first and last name. Email address cannot be changed here.
				</p>
			</div>

			{success && (
				<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
					<CheckCircle2 className="text-accent size-5 shrink-0" />
					<p className="text-accent text-sm font-medium">Name updated successfully.</p>
				</div>
			)}

			<div className="grid gap-3 sm:grid-cols-2">
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="firstName" className="text-xs">
						First Name
					</Label>
					<Input
						id="firstName"
						placeholder="First name"
						value={firstName}
						onChange={(e) => setFirstName(e.target.value)}
						className="text-sm"
					/>
				</div>
				<div className="flex flex-col gap-1.5">
					<Label htmlFor="lastName" className="text-xs">
						Last Name
					</Label>
					<Input
						id="lastName"
						placeholder="Last name"
						value={lastName}
						onChange={(e) => setLastName(e.target.value)}
						className="text-sm"
					/>
				</div>
			</div>

			<Button onClick={handleSave} disabled={loading} className="w-full gap-2">
				<UserCheck className="size-4" />
				{loading ? "Saving..." : "Save Name"}
			</Button>

			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
};

export { NameUpdateForm };
