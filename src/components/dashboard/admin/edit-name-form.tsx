"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type EditNameFormProps = {
	initialFirstName: string;
	initialLastName: string;
	// returns an error message, or null when the save succeeded
	onSave: (firstName: string, lastName: string) => Promise<string | null>;
	onCancel: () => void;
};

// a small inline name editor shared by the staff and accounts tables. saves via
// the parent's action and shows any error in place
const EditNameForm = ({
	initialFirstName,
	initialLastName,
	onSave,
	onCancel,
}: EditNameFormProps) => {
	const [firstName, setFirstName] = useState(initialFirstName);
	const [lastName, setLastName] = useState(initialLastName);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const save = async () => {
		if (!firstName.trim()) {
			setError("First name is required.");
			return;
		}
		setSaving(true);
		setError(null);
		const saveError = await onSave(firstName.trim(), lastName.trim());
		setSaving(false);
		if (saveError) setError(saveError);
	};

	return (
		<div className="flex flex-col gap-2">
			<div className="grid gap-2 sm:grid-cols-2">
				<Input
					value={firstName}
					onChange={(event) => setFirstName(event.target.value)}
					placeholder="First name"
					aria-label="First name"
				/>
				<Input
					value={lastName}
					onChange={(event) => setLastName(event.target.value)}
					placeholder="Last name"
					aria-label="Last name"
				/>
			</div>
			<div className="flex items-center gap-2">
				<Button size="sm" onClick={save} disabled={saving}>
					{saving ? "Saving..." : "Save"}
				</Button>
				<Button size="sm" variant="outline" onClick={onCancel} disabled={saving}>
					Cancel
				</Button>
				{error && <p className="text-destructive text-xs">{error}</p>}
			</div>
		</div>
	);
};

export { EditNameForm };
