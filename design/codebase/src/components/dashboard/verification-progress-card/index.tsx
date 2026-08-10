interface VerificationProgressCardProps {
	status: string;
}

// the three user-facing milestones — internal backend states are collapsed into these
const steps = [
	{ id: 1, label: "Upload Documents" },
	{ id: 2, label: "Under Review" },
	{ id: 3, label: "Verified" },
];

// maps each backend status to how many steps the user has completed.
// pending_payment sits at step 1 because document upload is done; payment is
// an internal gate the user doesn't act on. rejected and verification_expired
// land at step 2 so the progress indicator shows where the process stalled.
const stepMap: Record<string, number> = {
	draft: 0,
	pending_payment: 1,
	pending_review: 2,
	verified: 3,
	rejected: 2,
	verification_expired: 1,
};

// statuses that mean the account is permanently or indefinitely restricted —
// shown as a blocking message rather than a progress tracker
const terminalNegativeStates = ["blacklisted", "deactivated"];

const VerificationProgressCard = ({ status }: VerificationProgressCardProps) => {
	// short-circuit for restricted accounts — no progress to show
	if (terminalNegativeStates.includes(status)) {
		return (
			<div className="bg-card border-border rounded-xl border p-6">
				<p className="text-muted-foreground mb-4 text-sm font-semibold">
					Verification Progress
				</p>
				<p className="text-destructive text-sm">
					Your account has been restricted. Please contact support.
				</p>
			</div>
		);
	}

	// fall back to 0 (no steps complete) for any unknown status
	const currentStep = stepMap[status] ?? 0;

	return (
		<div className="bg-card border-border rounded-xl border p-6">
			<p className="text-muted-foreground mb-4 text-sm font-semibold">
				Verification Progress
			</p>

			<div className="flex flex-col gap-4">
				{steps.map((step) => {
					// a step is complete when its id is at or below the current progress index
					const complete = step.id <= currentStep;

					// highlight the step where the process stalled with a destructive colour
					// rather than an active/complete colour
					const isFailed =
						(status === "rejected" || status === "verification_expired") &&
						step.id === currentStep;

					return (
						<div key={step.id} className="flex items-center gap-3">
							<div
								className={`flex size-7 items-center justify-center rounded-full text-xs font-semibold ${
									isFailed
										? "bg-destructive text-destructive-foreground"
										: complete
											? "bg-accent text-accent-foreground"
											: "bg-muted text-muted-foreground"
								}`}
							>
								{step.id}
							</div>
							<span
								className={`text-sm ${
									complete ? "text-foreground" : "text-muted-foreground"
								}`}
							>
								{step.label}
							</span>
						</div>
					);
				})}
			</div>

			{/* only shown once fully verified — signals the profile is live */}
			{status === "verified" && (
				<p className="text-accent mt-3 text-sm font-medium">
					Your profile is verified and publicly visible.
				</p>
			)}
		</div>
	);
};

export { VerificationProgressCard };
