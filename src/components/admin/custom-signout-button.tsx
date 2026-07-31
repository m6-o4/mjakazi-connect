"use client";

import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

const CustomSignOutButton = () => {
	const { signOut } = useClerk();

	const handleSignOut = async () => {
		await signOut({ redirectUrl: "/" });
	};

	return (
		<Button variant="destructive" size="lg" onClick={handleSignOut}>
			Log out
		</Button>
	);
};

export { CustomSignOutButton };
