"use client";

import { useUser } from "@clerk/nextjs";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps, useEffect, useRef } from "react";
import posthog from "posthog-js";

const ThemeProvider = ({
	children,
	...props
}: ComponentProps<typeof NextThemesProvider>) => {
	const { isLoaded, user } = useUser();
	const identifiedUserId = useRef<string | null>(null);

	useEffect(() => {
		if (!isLoaded || !user) return;

		if (identifiedUserId.current && identifiedUserId.current !== user.id) {
			posthog.reset();
		}

		if (identifiedUserId.current !== user.id) {
			posthog.identify(user.id, {
				email: user.primaryEmailAddress?.emailAddress,
				name: user.fullName ?? undefined,
				role: user.publicMetadata.role,
			});
			identifiedUserId.current = user.id;
		}
	}, [isLoaded, user]);

	return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
};

export { ThemeProvider };
