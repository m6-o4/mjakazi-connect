import { DocumentUploadCard } from "@/components/dashboard/document-upload-card";
import { LegalNameForm } from "@/components/dashboard/mjakazi/legal-name-form";
import { PaymentCard } from "@/components/dashboard/mjakazi/payment-card";
import { SubmitVerificationCard } from "@/components/dashboard/submit-verification-card";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Verification" };

// once a submission is in review or beyond, the legal name is tied to the
// identity documents under assessment and must not change mid-process
const LOCKED_STATUSES = ["pending_review", "verified", "blacklisted", "deactivated"];

const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity || identity.role !== "mjakazi") redirect("/sign-in");

	// fall back to "draft" so the page renders correctly before a status is assigned
	const verificationStatus = identity.verificationStatus ?? "draft";

	// fetch the profile to access legal name fields and rejection feedback
	// both are needed by child components and are resolved once here to avoid
	// redundant queries
	const profileQuery = await payload.find({
		collection: "wajakaziprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const profile = profileQuery.docs[0] ?? null;
	const legalFirstName = profile?.legalFirstName ?? null;
	const legalLastName = profile?.legalLastName ?? null;
	const isNameLocked = LOCKED_STATUSES.includes(verificationStatus);

	// rejection feedback is surfaced on the submit card so the mjakazi knows
	// exactly what to correct before attempting a resubmission
	const rejectionReason = profile?.rejectionReason ?? null;
	const verificationAttempts = profile?.verificationAttempts ?? 0;

	// resolve vault documents server-side so upload cards can show current state
	// and hold the ids required to replace an existing document
	const existingDocs = await payload.find({
		collection: "vault",
		where: { profile: { equals: identity.wajakaziProfileId } },
		overrideAccess: true,
		limit: 10,
	});

	const uploadedTypes = existingDocs.docs.map((doc: any) => doc.documentType);
	const hasNationalId = uploadedTypes.includes("national_id");
	const hasGoodConduct = uploadedTypes.includes("good_conduct");
	// both mandatory documents must be present before the submit card allows submission
	const bothUploaded = hasNationalId && hasGoodConduct;

	// document ids are passed to upload cards so the replace flow targets the
	// correct vault record rather than creating a duplicate
	const nationalIdDoc = existingDocs.docs.find(
		(doc: any) => doc.documentType === "national_id",
	);
	const goodConductDoc = existingDocs.docs.find(
		(doc: any) => doc.documentType === "good_conduct",
	);

	// live registration fee from platform settings so the payment card always
	// shows the current amount without a redeploy
	const platformSettings = await payload.findGlobal({
		slug: "platform-settings",
		overrideAccess: true,
	});

	const registrationFee = platformSettings?.registrationFee ?? 1500;

	return (
		<>
			<DashboardTopbar title="Verification" />

			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
					<LegalNameForm
						currentLegalFirstName={legalFirstName}
						currentLegalLastName={legalLastName}
						isLocked={isNameLocked}
					/>

					{/* payment card is only relevant while the mjakazi is awaiting payment */}
					{verificationStatus === "pending_payment" && (
						<PaymentCard registrationFee={registrationFee} />
					)}
				</div>

				<div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
					<DocumentUploadCard
						documentType="good_conduct"
						label="Certificate of Good Conduct"
						alreadyUploaded={hasGoodConduct}
						existingDocumentId={goodConductDoc?.id ?? null}
					/>
					<DocumentUploadCard
						documentType="national_id"
						label="National ID"
						alreadyUploaded={hasNationalId}
						existingDocumentId={nationalIdDoc?.id ?? null}
					/>
					<SubmitVerificationCard
						verificationStatus={verificationStatus}
						documentsReady={bothUploaded}
						rejectionReason={rejectionReason}
						verificationAttempts={verificationAttempts}
						maxAttempts={3}
					/>
				</div>
			</main>
		</>
	);
};

export { Page as default };
