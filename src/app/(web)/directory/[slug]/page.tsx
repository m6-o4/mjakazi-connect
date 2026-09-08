import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPayload } from "payload";
import { cache } from "react";

import { Container } from "@/components/container";
import { DirectoryProfileDetail } from "@/components/web/directory/directory-profile-detail";
import { DirectoryProfileViewTracker } from "@/components/web/directory/directory-profile-view-tracker";
import { ProfileReviews } from "@/components/web/directory/profile-reviews";
import config from "@/payload-config";
import { getDirectoryProfile } from "@/services/directory.service";
import { getPublicReviews } from "@/services/review.service";

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

	if (!profile) return { title: "Profile not found | Mjakazi Connect" };

	return {
		title: `${profile.displayName ?? "Wajakazi"} | Mjakazi Connect`,
		description:
			"A document-verified wajakazi on Mjakazi Connect. Sign up as a mwajiri to view contact details.",
	};
};

const Page = async ({ params }: Args) => {
	const { slug } = await params;
	const profile = await queryProfile(slug);

	if (!profile) notFound();

	const payload = await getPayload({ config });
	const reviews = await getPublicReviews(payload, profile.id);

	return (
		<section className="pt-32 pb-24">
			<Container>
				<DirectoryProfileViewTracker slug={slug} />
				<DirectoryProfileDetail profile={profile} />
				<div className="mt-10">
					<ProfileReviews reviews={reviews} />
				</div>
			</Container>
		</section>
	);
};

export { Page as default, generateMetadata };
