import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { ProfileCompletenessCard } from "@/components/dashboard/mjakazi/profile-completeness-card";
import { VerificationStatusCard } from "@/components/dashboard/mjakazi/verification-status-card";
import {
	PROFILE_REQUIRED_FIELDS,
	PROFILE_REQUIRED_LABELS,
} from "@/lib/profile-constants";
import { DOCUMENT_TYPE_OPTIONS } from "@/lib/vault";
import config from "@/payload-config";
import { getMissingRequiredFields, getOwnProfile } from "@/services/profile.service";

export const metadata = { title: "Dashboard" };

const MjakaziDashboardPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const profile = await getOwnProfile(payload, user);

	const profileComplete = profile?.profileComplete ?? false;
	const missingFields = profile ? new Set(getMissingRequiredFields(profile)) : new Set();

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
				<VerificationStatusCard documents={documents} />
			) : (
				<ProfileCompletenessCard items={checklistItems} />
			)}
		</div>
	);
};

export { MjakaziDashboardPage as default };
