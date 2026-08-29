"use client";

import { Button } from "@/components/ui/button";

import { useClerk } from "@clerk/nextjs";

// sign-out must run client-side so clerk can clear its own cookies. redirects
// home rather than back to the dashboard, which would immediately re-protect
const SignOutButton = () => {
	const { signOut } = useClerk();

	return (
		<Button variant="ghost" onClick={() => void signOut({ redirectUrl: "/" })}>
			Sign out
		</Button>
	);
};

export { SignOutButton };
