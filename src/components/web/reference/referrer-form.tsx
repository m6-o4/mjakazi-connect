"use client";

import { useState } from "react";

import { submitReferralAction } from "@/app/actions/referrals";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { JOB_OPTIONS, type JobValue } from "@/lib/profile-constants";
import { REFERRAL_NOTE_MAX_LENGTH } from "@/lib/referral";
import type { ReferralInviteView } from "@/services/referral.service";

type ReferrerFormProps = {
	invite: ReferralInviteView;
	token: string;
};

// the service normalises dates to YYYY-MM-DD before they reach the client, so
// this only guards the empty case
const toDateInput = (value: string | null): string => (value ? value.slice(0, 10) : "");

// the public referral form. the referrer has no account — the token is the whole
// capability, and the server action re-checks it against the record
const ReferrerForm = ({ invite, token }: ReferrerFormProps) => {
	const [referrerName, setReferrerName] = useState(invite.referrerName);
	const [role, setRole] = useState<JobValue>(invite.role as JobValue);
	const [startDate, setStartDate] = useState(toDateInput(invite.startDate));
	const [endDate, setEndDate] = useState(toDateInput(invite.endDate));
	const [note, setNote] = useState("");
	const [status, setStatus] = useState<"idle" | "submitting" | "done">("idle");
	const [error, setError] = useState<string | null>(null);

	const submit = async () => {
		setStatus("submitting");
		setError(null);
		try {
			const result = await submitReferralAction({
				token,
				referrerName,
				role,
				startDate,
				endDate,
				note,
			});
			if (!result.success) {
				setError(result.error ?? "Could not submit your referral.");
				setStatus("idle");
				return;
			}
			setStatus("done");
		} catch {
			setError("Could not submit your referral.");
			setStatus("idle");
		}
	};

	if (status === "done") {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Thank you</CardTitle>
					<CardDescription>Your referral has been submitted for review.</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						{invite.mjakaziName} will be notified once it is published. You can close this
						page.
					</p>
				</CardContent>
			</Card>
		);
	}

	const canSubmit = Boolean(
		referrerName.trim() && role && startDate && endDate && note.trim(),
	);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Give a referral for {invite.mjakaziName}</CardTitle>
				<CardDescription>
					Confirm the details below and write a short referral. This is private — it is
					not shown publicly.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="space-y-2">
					<Label htmlFor="ref-name">Your name</Label>
					<Input
						id="ref-name"
						value={referrerName}
						onChange={(event) => setReferrerName(event.target.value)}
						maxLength={120}
					/>
				</div>

				<div className="space-y-2">
					<Label htmlFor="ref-role">Role they held</Label>
					<Select
						value={role || null}
						onValueChange={(value) => {
							if (value) setRole(value as JobValue);
						}}
					>
						<SelectTrigger id="ref-role" className="w-full">
							<SelectValue placeholder="Select the role" />
						</SelectTrigger>
						<SelectContent>
							{JOB_OPTIONS.map((option) => (
								<SelectItem key={option.value} value={option.value}>
									{option.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="grid gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="ref-start">From</Label>
						<Input
							id="ref-start"
							type="date"
							value={startDate}
							onChange={(event) => setStartDate(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="ref-end">Until</Label>
						<Input
							id="ref-end"
							type="date"
							value={endDate}
							onChange={(event) => setEndDate(event.target.value)}
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="ref-note">Your referral</Label>
					<Textarea
						id="ref-note"
						value={note}
						onChange={(event) => setNote(event.target.value)}
						maxLength={REFERRAL_NOTE_MAX_LENGTH}
						placeholder="Describe how it was to work with them."
					/>
				</div>

				{error ? <p className="text-destructive text-xs">{error}</p> : null}

				<Button
					type="button"
					onClick={submit}
					disabled={status === "submitting" || !canSubmit}
					className="self-start"
				>
					{status === "submitting" ? "Submitting..." : "Submit referral"}
				</Button>
			</CardContent>
		</Card>
	);
};

export { ReferrerForm };
