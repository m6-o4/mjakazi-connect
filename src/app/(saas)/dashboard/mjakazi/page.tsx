import { Wallet } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { OpportunitiesCard } from "@/components/dashboard/mjakazi/opportunities-card";
import { ProfileCompletenessCard } from "@/components/dashboard/mjakazi/profile-completeness-card";
import { ReviewsPanel } from "@/components/dashboard/mjakazi/reviews/reviews-panel";
import { VerificationStatusCard } from "@/components/dashboard/mjakazi/verification-status-card";
import { VerificationStateCard } from "@/components/dashboard/mjakazi/verification/verification-state";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	PROFILE_REQUIRED_FIELDS,
	PROFILE_REQUIRED_LABELS,
} from "@/lib/profile-constants";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/vault";
import config from "@/payload-config";
import { listReceivedEois } from "@/services/eoi.service";
import { getMissingRequiredFields, getOwnProfile } from "@/services/profile.service";
import { listWorkerReviews } from "@/services/review.service";
import { getFreeResubmissionsRemaining } from "@/services/verification.service";

export const metadata = { title: "Dashboard" };

const MjakaziDashboardPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const [profile, receivedEois, workerReviews] = await Promise.all([
		getOwnProfile(payload, user),
		listReceivedEois(payload, user),
		listWorkerReviews(payload, user),
	]);
	const reviews = workerReviews.success ? workerReviews.data : [];

	const profileComplete = profile?.profileComplete ?? false;
	const verificationState = profile?.verificationState ?? "draft";
	const missingFields = profile ? new Set(getMissingRequiredFields(profile)) : new Set();
	const pendingInterestCount = receivedEois.filter((eoi) => eoi.state === "sent").length;

	const checklistItems = PROFILE_REQUIRED_FIELDS.map((field) => ({
		label: PROFILE_REQUIRED_LABELS[field],
		complete: !missingFields.has(field),
		href: "/dashboard/mjakazi/profile",
	}));

	// which identity documents the worker has uploaded so far. an explicit select
	// omits the private url, which must never reach the client
	const uploadedDocumentTypes = new Set<string>();
	if (profile) {
		const docsResult = await payload.find({
			collection: "vault-documents",
			where: { profile: { equals: profile.id } },
			limit: 10,
			select: { documentType: true },
			overrideAccess: false,
			req: { user },
		});
		for (const doc of docsResult.docs) {
			uploadedDocumentTypes.add(doc.documentType);
		}
	}

	const documents = DOCUMENT_TYPE_OPTIONS.map(({ label, value }) => ({
		label,
		uploaded: uploadedDocumentTypes.has(value),
	}));

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">
					Welcome{profile?.displayName ? `, ${profile.displayName}` : ""}
				</h1>
				<p className="text-muted-foreground mt-1 text-sm">Here is your profile status.</p>
			</div>

			{profileComplete ? (
				verificationState === "draft" ? (
					<VerificationStatusCard documents={documents} />
				) : verificationState === "pending_payment" ? (
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Wallet className="text-accent size-5 shrink-0" />
								Awaiting payment
							</CardTitle>
							<CardDescription>
								Pay the verification fee so our team can review your documents.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<Link href="/dashboard/mjakazi/verification" className={buttonVariants()}>
								Continue to payment
							</Link>
						</CardContent>
					</Card>
				) : (
					<VerificationStateCard
						state={verificationState}
						verificationExpiry={profile?.verificationExpiry ?? null}
						rejectionReason={profile?.rejectionReason ?? null}
						freeResubmissionsRemaining={getFreeResubmissionsRemaining(
							profile?.verificationAttempts,
						)}
					/>
				)
			) : (
				<ProfileCompletenessCard items={checklistItems} />
			)}

			<OpportunitiesCard pendingCount={pendingInterestCount} />

			<div>
				<h2 className="text-heading text-lg font-semibold">Your reviews</h2>
				<p className="text-muted-foreground mt-1 text-sm">
					What waajiri say about you. Choose what appears on your public profile.
				</p>
			</div>
			<ReviewsPanel reviews={reviews} />
		</div>
	);
};

export { MjakaziDashboardPage as default };
