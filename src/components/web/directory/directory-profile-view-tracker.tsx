"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

// fires `profile_viewed` once per public profile view. on the public directory
// a profile is never unlocked, so isUnlocked is always false here (the mwajiri
// browse surface in 6.3/6.4 is what flips it to true)
const DirectoryProfileViewTracker = ({ slug }: { slug: string }) => {
	useEffect(() => {
		posthog.capture("profile_viewed", { isUnlocked: false });
	}, [slug]);

	return null;
};

export { DirectoryProfileViewTracker };
