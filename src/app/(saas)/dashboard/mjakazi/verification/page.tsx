import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { SubmitVerification } from "@/components/dashboard/mjakazi/verification/submit-verification";
import { VerificationPaymentFlow } from "@/components/dashboard/mjakazi/verification/verification-payment-flow";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/vault";
import config from "@/payload-config";
import { getOwnProfile } from "@/services/profile.service";
import { getVerificationFee } from "@/services/settings.service";
import { getFreeResubmissionsRemaining } from "@/services/verification.service";

export const metadata: Metadata = { title: "Verification" };

const MjakaziVerificationPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const profile = await getOwnProfile(payload, user);
	if (!profile) redirect("/dashboard/mjakazi");

	// which identity documents are uploaded. an explicit select omits the private
	// url, which must never reach the client
	const uploadedTypes = new Set<string>();
	const docsResult = await payload.find({
		collection: "vault-documents",
		where: { profile: { equals: profile.id } },
		limit: 10,
		select: { documentType: true },
		overrideAccess: false,
		req: { user },
	});
	for (const doc of docsResult.docs) {
		uploadedTypes.add(doc.documentType);
	}
	const hasBothDocuments = DOCUMENT_TYPE_OPTIONS.every(({ value }) =>
		uploadedTypes.has(value),
	);
	const profileComplete = profile.profileComplete === true;
	const verificationFee =
		profile.verificationState === "pending_payment"
			? await getVerificationFee(payload)
			: null;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Verification</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Submit your profile and track your verification status.
				</p>
			</div>

			{profile.verificationState === "draft" ? (
				<SubmitVerification
					profileComplete={profileComplete}
					hasBothDocuments={hasBothDocuments}
				/>
			) : (
				<VerificationPaymentFlow
					state={profile.verificationState}
					fee={verificationFee}
					phone={profile.phone ?? ""}
					verificationExpiry={profile.verificationExpiry}
					rejectionReason={profile.rejectionReason}
					freeResubmissionsRemaining={getFreeResubmissionsRemaining(
						profile.verificationAttempts,
					)}
				/>
			)}
		</div>
	);
};

export { MjakaziVerificationPage as default };
