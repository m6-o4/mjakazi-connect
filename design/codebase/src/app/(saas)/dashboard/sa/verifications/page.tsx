import { PendingVerificationTable } from "@/components/dashboard/admin/pending-verification-table";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Verifications" };

const Page = async () => {
	const { userId } = await auth();

	// unauthenticated users have no business here
	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// only super-admins (sa) can access the verification queue
	if (!identity) redirect("/sign-in");
	if (identity.role !== "sa") redirect("/sign-in");

	// fetch profiles awaiting manual review, newest submissions first
	const pendingProfiles = await payload.find({
		collection: "wajakaziprofiles",
		where: { verificationStatus: { equals: "pending_review" } },
		overrideAccess: true,
		depth: 1,
		sort: "-verificationSubmittedAt",
		limit: 100,
	});

	// attach vault documents to each profile so the reviewer has everything
	// needed on one page without additional round-trips from the client
	const profilesWithDocuments = await Promise.all(
		pendingProfiles.docs.map(async (profile) => {
			const docs = await payload.find({
				collection: "vault",
				where: { profile: { equals: profile.id } },
				overrideAccess: true,
				limit: 10,
			});

			return {
				id: profile.id,
				displayName: profile.displayName,
				verificationSubmittedAt: profile.verificationSubmittedAt ?? null,
				verificationAttempts: profile.verificationAttempts ?? 0,
				// expose only the fields the table actually needs
				documents: docs.docs.map((doc: any) => ({
					id: doc.id,
					documentType: doc.documentType,
					filename: doc.filename,
					url: doc.url,
				})),
			};
		}),
	);

	return (
		<>
			<DashboardTopbar title="Pending Verifications" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<PendingVerificationTable profiles={profilesWithDocuments} />
			</main>
		</>
	);
};

export { Page as default };
