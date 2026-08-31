"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { createStaffAction } from "@/app/actions/staff";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// creates a new staff account. the temporary password is generated server-side
// and never reaches the browser — the new staff member resets it on first sign-in
const CreateStaffForm = () => {
	const router = useRouter();
	const [firstName, setFirstName] = useState("");
	const [lastName, setLastName] = useState("");
	const [email, setEmail] = useState("");
	const [loading, setLoading] = useState(false);
	const [success, setSuccess] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		setLoading(true);
		setError(null);
		setSuccess(false);

		const result = await createStaffAction({ firstName, lastName, email });
		if (!result.success) {
			setError(result.error ?? "Could not create the staff account.");
			setLoading(false);
			return;
		}

		setSuccess(true);
		setFirstName("");
		setLastName("");
		setEmail("");
		setLoading(false);
		router.refresh();
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Create staff account</CardTitle>
				<CardDescription>
					The new staff member resets their password on first sign-in.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				{success && (
					<p className="text-success text-sm font-medium">Staff account created.</p>
				)}

				<div className="grid gap-3 sm:grid-cols-2">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="staff-first-name">First name</Label>
						<Input
							id="staff-first-name"
							value={firstName}
							onChange={(event) => setFirstName(event.target.value)}
							placeholder="Jane"
						/>
					</div>
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="staff-last-name">Last name</Label>
						<Input
							id="staff-last-name"
							value={lastName}
							onChange={(event) => setLastName(event.target.value)}
							placeholder="Doe"
						/>
					</div>
				</div>

				<div className="flex flex-col gap-1.5">
					<Label htmlFor="staff-email">Email address</Label>
					<Input
						id="staff-email"
						type="email"
						value={email}
						onChange={(event) => setEmail(event.target.value)}
						placeholder="staff@mjakaziconnect.co.ke"
					/>
				</div>

				<Button onClick={submit} disabled={loading} className="w-full">
					{loading ? "Creating..." : "Create staff account"}
				</Button>

				{error && <p className="text-destructive text-sm">{error}</p>}
			</CardContent>
		</Card>
	);
};

export { CreateStaffForm };
