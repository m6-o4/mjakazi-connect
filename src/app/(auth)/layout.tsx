import { ReactNode } from "react";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import { geist } from "@/lib/fonts";
import { ThemeProvider } from "@/components/providers/theme-provider";

// load foundational styles for the application auth
import "@/globals.css";

const metadata: Metadata = {
	description: "Sign in to continue.",
	robots: { follow: false, index: false },
	title: "Sign In | Superior Software Solutions",
	icons: "/favicon.png",
};

// root layout for the auth group. renders html/body directly because this
// project uses multiple root layouts, one per route group
const AuthLayout = (props: { children: ReactNode }) => {
	const { children } = props;

	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body
					className={cn(
						"bg-muted flex min-h-screen items-center justify-center p-4",
						geist.className,
					)}
				>
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

export { AuthLayout as default, metadata };
