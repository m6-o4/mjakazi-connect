import { DocumentViewCard } from "@/components/dashboard/mjakazi/document-view-card";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "My Documents" };

// maps internal document type values to user-facing labels
const documentTypeLabel: Record<string, string> = {
	national_id: "National ID",
	good_conduct: "Certificate of Good Conduct",
	qualification: "Qualification",
	other: "Other Document",
};

// server component — fetches the authenticated mjakazi's vault documents at request time
const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// non-mjakazi users have no documents to view here
	if (!identity || identity.role !== "mjakazi") redirect("/sign-in");

	// fetch all vault documents belonging to this mjakazi's profile;
	// overrideAccess because collection-level access is admin/sa only —
	// document-level ownership is enforced separately by the proxy route at view time
	const vaultQuery = await payload.find({
		collection: "vault",
		where: { profile: { equals: identity.wajakaziProfileId } },
		overrideAccess: true,
		limit: 20,
	});

	const documents = vaultQuery.docs;

	return (
		<>
			<DashboardTopbar title="My Documents" />

			<main className="flex flex-1 flex-col gap-6 p-6">
				{documents.length === 0 ? (
					// empty state — directs the mjakazi to upload via the verification flow
					<div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
						<p className="text-muted-foreground text-sm">No documents on file yet.</p>
						<Link
							href="/dashboard/mjakazi/verification"
							className="text-primary text-sm font-medium underline-offset-4 hover:underline"
						>
							Go to Verification to upload your documents
						</Link>
					</div>
				) : (
					// render a card per document; label falls back to the raw type string if unmapped
					<div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
						{documents.map((doc: any) => (
							<DocumentViewCard
								key={doc.id}
								documentId={doc.id}
								label={documentTypeLabel[doc.documentType] ?? doc.documentType}
							/>
						))}
					</div>
				)}
			</main>
		</>
	);
};

export { Page as default };
