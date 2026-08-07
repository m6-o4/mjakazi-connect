import type { Metadata } from "next";
import { ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { jakartaSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

// load foundational styles for the saas application
import "@/globals.css";

const metadata: Metadata = {
	description: "Application dashboard.",
	robots: { follow: false, index: false },
	title: "App",
	icons: "/favicon.png",
};

// root layout for the saas application. auth.protect() gates the whole group,
// mirroring (payload)/layout.tsx. note this covers pages only, not route
// handlers, which must call auth.protect() themselves
const SaasLayout = async (props: { children: ReactNode }) => {
	const { children } = props;

	await auth.protect();

	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body className={cn("antialiased", jakartaSans.className)}>
					<ThemeProvider
						attribute="class"
						defaultTheme="dark"
						enableSystem
						disableTransitionOnChange
					>
						<main>{children}</main>
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
};

export { SaasLayout as default, metadata };
