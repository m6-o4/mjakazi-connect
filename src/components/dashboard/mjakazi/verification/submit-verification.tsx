"use client";

import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useState } from "react";

import { submitForVerificationAction } from "@/app/actions/verification";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SubmitVerificationProps = {
	profileComplete: boolean;
	hasBothDocuments: boolean;
};

// the draft-state submit flow. mirrors the service's readiness guard in the UI —
// the button stays disabled until the profile is complete and both documents are
// uploaded, and each missing piece links to where it is fixed. the service
// re-checks on submit, so this is a courtesy, never the control
const SubmitVerification = ({
	profileComplete,
	hasBothDocuments,
}: SubmitVerificationProps) => {
	const router = useRouter();
	const [submitting, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const ready = profileComplete && hasBothDocuments;

	const checks = [
		{
			label: "Profile complete",
			done: profileComplete,
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Both documents uploaded",
			done: hasBothDocuments,
			href: "/dashboard/mjakazi/documents",
		},
	];

	const submit = async () => {
		setSubmitting(true);
		setError(null);
		try {
			const result = await submitForVerificationAction();
			if (!result.success) {
				setError(result.error ?? "Could not submit your profile.");
				return;
			}
			posthog.capture("verification_submitted");
			router.refresh();
		} catch {
			setError("Could not submit your profile.");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle>Submit for verification</CardTitle>
				<CardDescription>
					Complete your profile and upload both documents, then submit them for our team
					to review.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<ul className="flex flex-col gap-1">
					{checks.map((check) => (
						<li key={check.label}>
							<Link
								href={check.done ? "#" : check.href}
								className={cn(
									"flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
									check.done ? "cursor-default" : "hover:bg-muted",
								)}
							>
								{check.done ? (
									<CheckCircle2 className="text-accent size-4 shrink-0" />
								) : (
									<Circle className="text-muted-foreground size-4 shrink-0" />
								)}
								<span
									className={cn(
										check.done ? "text-muted-foreground line-through" : "text-foreground",
									)}
								>
									{check.label}
								</span>
								{!check.done && (
									<ArrowRight className="text-muted-foreground ml-auto size-3.5" />
								)}
							</Link>
						</li>
					))}
				</ul>

				{error && <p className="text-destructive text-xs">{error}</p>}

				<Button type="button" onClick={submit} disabled={!ready || submitting}>
					{submitting ? "Submitting..." : "Submit for verification"}
				</Button>
			</CardContent>
		</Card>
	);
};

export { SubmitVerification };
