import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";
import { Info } from "lucide-react";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { DocumentVault } from "@/components/dashboard/mjakazi/document-vault";
import config from "@/payload-config";
import { getOwnProfile } from "@/services/profile.service";

export const metadata: Metadata = { title: "Documents" };

type DocumentInfo = {
	id: string;
	documentType: string;
	filename: string | null;
};

const MjakaziDocumentsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const profile = await getOwnProfile(payload, user);
	if (!profile) redirect("/dashboard/mjakazi");

	// an explicit select omits the upload's url (the private object path), so it
	// can never reach the client. documents are only opened through the audited
	// /api/actions/vault/{id} route
	const result = await payload.find({
		collection: "vault-documents",
		where: { profile: { equals: profile.id } },
		limit: 10,
		select: { id: true, documentType: true, filename: true },
		overrideAccess: false,
		req: { user },
	});

	const documents: DocumentInfo[] = result.docs.map((doc) => ({
		id: doc.id,
		documentType: doc.documentType,
		filename: doc.filename ?? null,
	}));

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">My Documents</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Upload your National ID and Certificate of Good Conduct so our team can verify
					you.
				</p>
			</div>

			{profile.verificationState === "verified" ? (
				<div className="bg-muted text-muted-foreground border-border flex items-start gap-2 rounded-lg border p-4 text-sm">
					<Info className="text-accent mt-0.5 size-4 shrink-0" />
					<p>
						You&apos;re verified. Replacing a document will require re-verification and
						send your profile back to our team for review.
					</p>
				</div>
			) : null}

			<DocumentVault documents={documents} />
		</div>
	);
};

export { MjakaziDocumentsPage as default };
