import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { cache } from "react";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { BrowseContactCard } from "@/components/dashboard/mwajiri/browse/browse-contact-card";
import { SaveToggle } from "@/components/dashboard/mwajiri/browse/save-toggle";
import { DirectoryProfileDetail } from "@/components/web/directory/directory-profile-detail";
import { DirectoryProfileViewTracker } from "@/components/web/directory/directory-profile-view-tracker";
import config from "@/payload-config";
import { getDirectoryProfile } from "@/services/directory.service";
import { isSaved } from "@/services/saved.service";
import { getOwnSubscription } from "@/services/subscription.service";

type Args = {
	params: Promise<{ slug: string }>;
};

// memoized per request so generateMetadata and the page body share one query
const queryProfile = cache(async (slug: string) => {
	const payload = await getPayload({ config });
	return getDirectoryProfile(payload, slug);
});

const generateMetadata = async ({ params }: Args): Promise<Metadata> => {
	const { slug } = await params;
	const profile = await queryProfile(slug);

	if (!profile) return { title: "Profile not found" };

	return {
		title: `${profile.displayName ?? "Wajakazi"} | Mjakazi Connect`,
		description:
			"A document-verified wajakazi on Mjakazi Connect. Contact details unlock with an active subscription.",
	};
};

const Page = async ({ params }: Args) => {
	const { slug } = await params;

	const [user, profile] = await Promise.all([getCurrentUser(), queryProfile(slug)]);

	if (!profile) notFound();

	// the browse detail reads through the same guarded path as the public detail —
	// no contact fields are ever selected. only the affordance below knows the
	// subscription state, and it renders placeholders, never real values
	let isActive = false;
	let saved = false;
	if (user) {
		const payload = await getPayload({ config });
		const [subscription, wasSaved] = await Promise.all([
			getOwnSubscription(payload, user),
			isSaved(payload, user, profile.id),
		]);
		isActive = subscription?.subscriptionState === "active";
		saved = wasSaved;
	}

	return (
		<div className="flex flex-col gap-6">
			<DirectoryProfileViewTracker slug={slug} />
			<DirectoryProfileDetail
				profile={profile}
				backHref="/dashboard/mwajiri/browse"
				headerAction={<SaveToggle mjakaziId={profile.id} initiallySaved={saved} />}
				contactSlot={<BrowseContactCard isActive={isActive} />}
			/>
		</div>
	);
};

export { Page as default, generateMetadata };
