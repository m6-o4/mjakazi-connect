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
import { listSavedProfileIds } from "@/services/saved.service";
import { getOwnSubscription } from "@/services/subscription.service";

export const metadata: Metadata = { title: "Saved Wajakazi" };

// cards link back into the mwajiri browse detail (which carries the contact
// unlock affordance), not the public directory
const BROWSE_BASE = "/dashboard/mwajiri/browse";

const SavedWajakaziPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const [ids, subscription] = await Promise.all([
		listSavedProfileIds(payload, user),
		getOwnSubscription(payload, user),
	]);
	const profiles = await listDirectoryProfilesByIds(payload, ids);

	// preserve the save order (most recently saved first); a stale save — whose
	// profile has since left the directory — is silently absent from this map
	const byId = new Map(profiles.map((profile) => [profile.id, profile]));
	const ordered = ids
		.map((id) => byId.get(id))
		.filter((profile): profile is NonNullable<typeof profile> => profile !== undefined);

	const sendable = ordered.map((profile) => ({
		id: profile.id,
		displayName: profile.displayName ?? "",
		location: profile.location ?? null,
	}));

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Saved wajakazi</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Your shortlist. Open a profile to unlock contact details.
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
					<EoiSend
						profiles={sendable}
						subscriptionActive={subscription?.subscriptionState === "active"}
					/>
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
