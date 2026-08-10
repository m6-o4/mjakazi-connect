import { VerificationRowActions } from "@/components/dashboard/admin/verification-row-actions";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";

interface VaultDocument {
	id: string;
	documentType: string;
	filename: string;
	url: string;
}

interface PendingProfile {
	id: string;
	displayName: string;
	verificationSubmittedAt: string | null;
	verificationAttempts: number;
	documents: VaultDocument[];
}

interface PendingVerificationTableProps {
	profiles: PendingProfile[];
}

const documentTypeLabels: Record<string, string> = {
	national_id: "National ID",
	good_conduct: "Certificate of Good Conduct",
	qualification: "Qualification",
	other: "Other",
};

const PendingVerificationTable = ({ profiles }: PendingVerificationTableProps) => {
	if (profiles.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center">
				<div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-2xl">
					<FileText className="text-muted-foreground size-6" />
				</div>
				<p className="font-display text-foreground text-base font-semibold">
					No pending verifications
				</p>
				<p className="text-muted-foreground mt-1 text-sm">
					All submitted verifications have been reviewed.
				</p>
			</div>
		);
	}

	return (
		<div className="bg-card border-border overflow-hidden rounded-xl border">
			<div className="border-border border-b px-6 py-4">
				<p className="font-display text-foreground text-base font-semibold">
					Pending Review
				</p>
				<p className="text-muted-foreground mt-0.5 text-sm">
					{profiles.length} worker{profiles.length !== 1 ? "s" : ""} awaiting verification
				</p>
			</div>

			<div className="divide-border divide-y">
				{profiles.map((profile) => (
					<div key={profile.id} className="p-6">
						<div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
							{/* worker info */}
							<div className="flex flex-col gap-2">
								<div className="flex items-center gap-3">
									<div className="bg-primary/10 flex size-9 shrink-0 items-center justify-center rounded-full">
										<span className="text-primary text-xs font-bold">
											{profile.displayName
												.split(" ")
												.map((n) => n[0])
												.join("")
												.slice(0, 2)
												.toUpperCase()}
										</span>
									</div>
									<div>
										<p className="text-foreground text-sm font-semibold">
											{profile.displayName}
										</p>
									</div>
								</div>

								<div className="flex flex-wrap items-center gap-2">
									{profile.verificationSubmittedAt && (
										<span className="text-muted-foreground text-xs">
											Submitted{" "}
											{new Date(profile.verificationSubmittedAt).toLocaleDateString(
												"en-KE",
												{
													day: "numeric",
													month: "short",
													year: "numeric",
												},
											)}
										</span>
									)}
									{profile.verificationAttempts > 1 && (
										<Badge variant="outline" className="text-xs">
											Attempt {profile.verificationAttempts}
										</Badge>
									)}
								</div>

								{/* document links */}
								{profile.documents.length > 0 ? (
									<div className="flex flex-wrap gap-2 pt-1">
										{profile.documents.map((doc) => (
											<a
												key={doc.id}
												href={`/apis/admin/vault-file?id=${doc.id}`}
												target="_blank"
												rel="noopener noreferrer"
												className="border-border bg-muted/40 hover:bg-muted text-foreground inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors"
											>
												<FileText className="size-3" />
												{documentTypeLabels[doc.documentType] ?? doc.documentType}
											</a>
										))}
									</div>
								) : (
									<p className="text-muted-foreground text-xs italic">
										No documents uploaded
									</p>
								)}
							</div>

							{/* approve / reject actions */}
							<div className="shrink-0">
								<VerificationRowActions profileId={profile.id} />
							</div>
						</div>
					</div>
				))}
			</div>
		</div>
	);
};

export { PendingVerificationTable };
