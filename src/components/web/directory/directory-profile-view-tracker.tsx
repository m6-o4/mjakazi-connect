"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// fires `profile_viewed` once per profile view. on the public directory a
// profile is never unlocked, so isUnlocked is always false there; the mwajiri
// browse surface passes true when the viewer has already unlocked the contact
const DirectoryProfileViewTracker = ({
	slug,
	isUnlocked = false,
}: {
	slug: string;
	isUnlocked?: boolean;
}) => {
	useEffect(() => {
		posthog.capture("profile_viewed", { isUnlocked });
	}, [slug, isUnlocked]);

	return null;
};

export { DirectoryProfileViewTracker };
