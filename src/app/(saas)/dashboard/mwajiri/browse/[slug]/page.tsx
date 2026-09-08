import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { cache } from "react";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { BrowseContactCard } from "@/components/dashboard/mwajiri/browse/browse-contact-card";
import { LeaveReviewForm } from "@/components/dashboard/mwajiri/browse/leave-review-form";
import { SaveToggle } from "@/components/dashboard/mwajiri/browse/save-toggle";
import { RatingStars } from "@/components/rating-stars";
import { Card, CardContent } from "@/components/ui/card";
import { DirectoryProfileDetail } from "@/components/web/directory/directory-profile-detail";
import { DirectoryProfileViewTracker } from "@/components/web/directory/directory-profile-view-tracker";
import config from "@/payload-config";
import { getContact, type Contact } from "@/services/contact.service";
import { getDirectoryProfile } from "@/services/directory.service";
import { getReviewFormState, type ReviewFormState } from "@/services/review.service";
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
	// no contact fields are ever selected. an already-unlocked profile returns its
	// contact via contact.service (the only reader), otherwise the card renders
	// placeholders and the affordance below knows only the subscription state
	let isActive = false;
	let saved = false;
	let isUnlocked = false;
	let contact: Contact | null = null;
	let reviewState: ReviewFormState | null = null;
	if (user) {
		const payload = await getPayload({ config });
		const [subscription, wasSaved, unlockedContact, formState] = await Promise.all([
			getOwnSubscription(payload, user),
			isSaved(payload, user, profile.id),
			getContact(payload, user, profile.id),
			getReviewFormState(payload, user, profile.id),
		]);
		isActive = subscription?.subscriptionState === "active";
		saved = wasSaved;
		isUnlocked = unlockedContact !== null;
		contact = unlockedContact;
		reviewState = formState;
	}

	return (
		<div className="flex flex-col gap-6">
			<DirectoryProfileViewTracker slug={slug} isUnlocked={isUnlocked} />
			<DirectoryProfileDetail
				profile={profile}
				backHref="/dashboard/mwajiri/browse"
				headerAction={<SaveToggle mjakaziId={profile.id} initiallySaved={saved} />}
				contactSlot={
					<BrowseContactCard
						mjakaziId={profile.id}
						isActive={isActive}
						contact={contact}
					/>
				}
			/>

			{reviewState?.eligible ? (
				<LeaveReviewForm mjakaziId={profile.id} />
			) : reviewState?.existing ? (
				<Card>
					<CardContent className="flex flex-col gap-2 py-6">
						<div className="flex items-center gap-2">
							<RatingStars rating={reviewState.existing.rating} />
							<span className="text-muted-foreground text-sm">
								{reviewState.existing.state === "pending"
									? "Awaiting moderation"
									: reviewState.existing.state === "published"
										? "Published"
										: "Not published"}
							</span>
						</div>
						<p className="text-foreground text-sm leading-relaxed wrap-break-word">
							{reviewState.existing.comment}
						</p>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
};

export { Page as default, generateMetadata };
