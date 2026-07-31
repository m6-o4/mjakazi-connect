"use client";

import { useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

// sign-out has to happen client-side so clerk can clear its own cookies. a
// server component can revoke the session but cannot touch the browser's
const Page = () => {
	const { signOut } = useClerk();

	useEffect(() => {
		void signOut({ redirectUrl: "/" });
	}, [signOut]);

	return <p className="text-muted-foreground">Signing you out...</p>;
};

export { Page as default };
