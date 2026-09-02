"use client";

import posthog from "posthog-js";

import { Button } from "@/components/ui/button";

import { useClerk } from "@clerk/nextjs";

// sign-out must run client-side so clerk can clear its own cookies. redirects
// home rather than back to the dashboard, which would immediately re-protect
const SignOutButton = () => {
	const { signOut } = useClerk();

	const handleSignOut = () => {
		posthog.capture("sign_out_requested");
		posthog.reset();
		void signOut({ redirectUrl: "/" });
	};

	return (
		<Button variant="ghost" onClick={handleSignOut}>
			Sign out
		</Button>
	);
};

export { SignOutButton };
