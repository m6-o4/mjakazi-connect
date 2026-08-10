import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import { ReactNode } from "react";

// configure brand-specific typography with css variables for tailwind integration
const grotesk = Space_Grotesk({
	subsets: ["latin"],
	variable: "--font-sans",
	display: "swap",
});
const jakarta = Plus_Jakarta_Sans({
	subsets: ["latin"],
	variable: "--font-display",
	display: "swap",
});

// define the primary shell for the web frontend, managing site-wide providers and layout structure
const RootLayout = (props: { children: ReactNode }) => {
	const { children } = props;

	return (
		<html lang="en" suppressHydrationWarning>
			<body
				className={cn("", grotesk.variable, jakarta.variable)}
				suppressHydrationWarning
			>
				<ClerkProvider
					signInUrl="/sign-in"
					signUpUrl="/sign-up"
					signInFallbackRedirectUrl="/authenticating"
					signUpFallbackRedirectUrl="/authenticating"
				>
					<TooltipProvider>{children}</TooltipProvider>
				</ClerkProvider>
			</body>
		</html>
	);
};

export { RootLayout as default };
