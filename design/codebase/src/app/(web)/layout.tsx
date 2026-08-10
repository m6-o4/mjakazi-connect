import { ClarityTracker } from "@/components/clarity-tracker";
import { ThemeProvider } from "@/components/theme-provider";
import { Footer } from "@/payload/blocks/globals/footer/component";
import { Header } from "@/payload/blocks/globals/header/component";
import { getServerSideURL } from "@/payload/utilities/get-url";
import { mergeOpenGraph } from "@/payload/utilities/merge-opengraph";
import type { Metadata } from "next";
import { ReactNode } from "react";

// load foundational styles for the web application
import "@/styles/globals.css";

const WebLayout = ({ children }: { children: ReactNode }) => {
	return (
		// initialize global visual styles and typography variables
		<div className="bg-bg-subtle text-text-default flex min-h-screen flex-col font-sans antialiased">
			{/* initialize analytics tracking at the entry point */}
			<ClarityTracker />

			{/* provide theme context and manage appearance transitions */}
			<ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
				{/* render global site navigation */}
				<header>
					<Header />
				</header>

				{/* injectable region for page-specific content */}
				<main>{children}</main>

				{/* render global site footer with layout-aware positioning */}
				<footer className="mt-auto">
					<Footer />
				</footer>
			</ThemeProvider>
		</div>
	);
};

// construct global seo and social metadata using environment-aware utilities
const metadata: Metadata = {
	// establish authority for relative resource resolution
	metadataBase: new URL(getServerSideURL()),
	// aggregate common open graph properties from centralized configuration
	openGraph: mergeOpenGraph(),
	twitter: {
		card: "summary_large_image",
		creator: "@m6o4solutions",
	},
	icons: {
		icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
	},
};

export { WebLayout as default, metadata };
