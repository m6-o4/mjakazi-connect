import { Bookmark } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { EoiSend } from "@/components/dashboard/mwajiri/saved/eoi-send";
import { Card, CardContent } from "@/components/ui/card";
import { DirectoryCard } from "@/components/web/directory/directory-card";
import config from "@/payload-config";
import { listDirectoryProfilesByIds } from "@/services/directory.service";
import {
	getEoiSendEligibility,
	listUnavailableForInterest,
} from "@/services/eoi.service";
import { listSavedProfileIds } from "@/services/saved.service";

export const metadata: Metadata = { title: "Shortlist" };

// cards link back into the mwajiri browse detail (which carries the contact
// unlock affordance), not the public directory
const BROWSE_BASE = "/dashboard/mwajiri/browse";

const SavedWajakaziPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const [ids, eligibility] = await Promise.all([
		listSavedProfileIds(payload, user),
		getEoiSendEligibility(payload, user),
	]);
	const [profiles, unavailable] = await Promise.all([
		listDirectoryProfilesByIds(payload, ids),
		listUnavailableForInterest(payload, user.id),
	]);

	// preserve the save order (most recently saved first); a stale save — whose
	// profile has since left the directory — is silently absent from this map
	const byId = new Map(profiles.map((profile) => [profile.id, profile]));
	const ordered = ids
		.map((id) => byId.get(id))
		.filter((profile): profile is NonNullable<typeof profile> => profile !== undefined);

	// profiles that already have an open interest, a contact grant or a live hire
	// cannot receive another batch, so they are kept out of the selector
	const sendable = ordered
		.filter((profile) => !unavailable.has(profile.id))
		.map((profile) => ({
			id: profile.id,
			displayName: profile.displayName ?? "",
			location: profile.location ?? null,
		}));
	const inProgress = ordered.length - sendable.length;

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Shortlist</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Wajakazi you have saved. Send an expression of interest to see their contact
					details.
				</p>
			</div>

			{ordered.length === 0 ? (
				<Card className="py-10">
					<CardContent className="flex flex-col items-center justify-center gap-3 text-center">
						<Bookmark className="text-muted-foreground/40 size-10" />
						<p className="text-muted-foreground text-sm">
							No saved wajakazi yet. Save a profile while browsing to keep it here.
						</p>
					</CardContent>
				</Card>
			) : (
				<>
					{sendable.length > 0 ? (
						<EoiSend
							profiles={sendable}
							minBatch={eligibility.policy.minBatch}
							maxBatch={eligibility.policy.maxBatch}
							canSend={eligibility.allowed}
							blockCode={eligibility.code}
							blockReason={eligibility.reason}
						/>
					) : null}

					{inProgress > 0 ? (
						<p className="text-muted-foreground text-sm">
							{inProgress === 1
								? "1 saved mjakazi already has an open interest or your contact details."
								: `${inProgress} saved wajakazi already have an open interest or your contact details.`}
						</p>
					) : null}

					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{ordered.map((profile) => (
							<DirectoryCard key={profile.id} profile={profile} basePath={BROWSE_BASE} />
						))}
					</div>
				</>
			)}
		</div>
	);
};

export { SavedWajakaziPage as default };
