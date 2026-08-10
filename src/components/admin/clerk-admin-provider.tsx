"use client";

import { ReactNode } from "react";

import { ClerkProvider } from "@clerk/nextjs";

// wraps the payload admin panel so clerk hooks (useClerk in the sign-out
// button) have context. authentication itself is enforced server-side by
// auth.protect() in (payload)/layout.tsx, not here
const ClerkAdminProvider = ({ children }: { children: ReactNode }) => {
	return <ClerkProvider>{children}</ClerkProvider>;
};

export { ClerkAdminProvider };
