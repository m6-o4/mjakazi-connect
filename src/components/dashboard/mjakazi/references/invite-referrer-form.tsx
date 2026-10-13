"use client";

import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { inviteReferrerAction } from "@/app/actions/referrals";
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
import { notifyError, notifySuccess } from "@/lib/notify";
import { JOB_OPTIONS, type JobValue } from "@/lib/profile-constants";

// the invite form for a former employer. the policy checks (outstanding cap, one
// per employer, re-invite cooldown), the token and the email all live in
// referral.service — this only collects the details and delegates
const InviteReferrerForm = () => {
	const router = useRouter();
	const [referrerName, setReferrerName] = useState("");
	const [referrerEmail, setReferrerEmail] = useState("");
	const [role, setRole] = useState<JobValue | "">("");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [submitting, setSubmitting] = useState(false);

	const canSubmit = Boolean(
		referrerName.trim() && referrerEmail.trim() && role && startDate && endDate,
	);

	const submit = async () => {
		if (!role) return;
		setSubmitting(true);
		try {
			const result = await inviteReferrerAction({
				referrerName,
				referrerEmail,
				role,
				startDate,
				endDate,
			});
			if (!result.success) {
				notifyError(result.error ?? "Could not send the invitation.");
				return;
			}
			notifySuccess("Invitation sent", {
				description: "We emailed them a link to give you a referral.",
			});
			posthog.capture("referral_invited", { role });
			setReferrerName("");
			setReferrerEmail("");
			setRole("");
			setStartDate("");
			setEndDate("");
			router.refresh();
		} catch {
			notifyError("Could not send the invitation.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Invite a former employer</CardTitle>
				<CardDescription>
					Worked for someone before Mjakazi Connect? Invite them to give you a private
					referral. They do not need an account.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="referrer-name">Employer&apos;s name</Label>
						<Input
							id="referrer-name"
							value={referrerName}
							onChange={(event) => setReferrerName(event.target.value)}
							maxLength={120}
							placeholder="e.g. Mrs. Wanjiru"
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="referrer-email">Employer&apos;s email</Label>
						<Input
							id="referrer-email"
							type="email"
							value={referrerEmail}
							onChange={(event) => setReferrerEmail(event.target.value)}
							maxLength={200}
							placeholder="name@example.com"
						/>
					</div>
				</div>

				<div className="space-y-2">
					<Label htmlFor="referrer-role">Role you held</Label>
					<Select
						value={role || null}
						onValueChange={(value) => setRole((value ?? "") as JobValue | "")}
					>
						<SelectTrigger id="referrer-role" className="w-full">
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

				<div className="grid gap-4 md:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor="referrer-start">Worked from</Label>
						<Input
							id="referrer-start"
							type="date"
							value={startDate}
							onChange={(event) => setStartDate(event.target.value)}
						/>
					</div>
					<div className="space-y-2">
						<Label htmlFor="referrer-end">Worked until</Label>
						<Input
							id="referrer-end"
							type="date"
							value={endDate}
							onChange={(event) => setEndDate(event.target.value)}
						/>
					</div>
				</div>

				<Button
					type="button"
					onClick={submit}
					disabled={submitting || !canSubmit}
					className="self-start"
				>
					{submitting ? "Sending..." : "Send invitation"}
				</Button>
			</CardContent>
		</Card>
	);
};

export { InviteReferrerForm };
