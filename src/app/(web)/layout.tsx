import type { Metadata } from "next";
import { ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { jakartaSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { Footer } from "@/payload/blocks/globals/footer/component";
import { Header } from "@/payload/blocks/globals/header/component";
import { getServerSideURL } from "@/payload/utilities/get-url";
import { mergeOpenGraph } from "@/payload/utilities/merge-opengraph";

import { ClerkProvider } from "@clerk/nextjs";

// load foundational styles for the web application
import "@/globals.css";

// root layout for the public site. renders html/body directly because this
// project uses multiple root layouts, one per route group
const WebLayout = (props: { children: ReactNode }) => {
	const { children } = props;

	return (
		<ClerkProvider>
			<html lang="en" suppressHydrationWarning>
				<body
					className={cn("flex min-h-screen flex-col antialiased", jakartaSans.className)}
				>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<header>
							<Header />
						</header>

						<main>{children}</main>

						<footer className="mt-auto">
							<Footer />
						</footer>
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
};

// centralize site-wide seo and social graph configurations
const metadata: Metadata = {
	metadataBase: new URL(getServerSideURL()),
	openGraph: mergeOpenGraph(),
	twitter: { card: "summary_large_image", creator: "@m6-o4" },
	icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }] },
};

export { WebLayout as default, metadata };
