import type { Metadata } from "next";
import { ReactNode } from "react";

import { ThemeProvider } from "@/components/providers/theme-provider";
import { jakartaSans } from "@/lib/fonts";
import { cn } from "@/lib/utils";

import { ClerkProvider } from "@clerk/nextjs";

// load foundational styles for the application auth
import "@/globals.css";

const metadata: Metadata = {
	title: "Mjakazi Connect",
	description: "Sign in or Sign up to Mjakazi Connect",
	robots: { follow: false, index: false },
	icons: "/favicon.svg",
};

// root layout for the auth group. renders html/body directly because this
// project uses multiple root layouts, one per route group
const AuthLayout = (props: { children: ReactNode }) => {
	const { children } = props;

	return (
		<ClerkProvider
			appearance={{
				options: {
					logoImageUrl: "/mjakazi-connect-logo.png",
					logoLinkUrl: "/",
				},
				elements: {
					logoBox: "flex justify-center",
					logoImage: "h-16 w-auto object-contain",
				},
			}}
		>
			<html lang="en" suppressHydrationWarning>
				<body className={cn("min-h-screen antialiased", jakartaSans.className)}>
					<ThemeProvider
						attribute="class"
						defaultTheme="system"
						enableSystem
						disableTransitionOnChange
					>
						<div className="bg-background flex min-h-screen">
							{/* brand panel — desktop only */}
							<div className="bg-primary relative hidden w-1/2 flex-col justify-between overflow-hidden p-12 lg:flex">
								<div className="border-primary-foreground/5 absolute -top-16 -right-16 size-64 rounded-full border-40" />
								<div className="border-accent/10 absolute -bottom-12 -left-12 size-48 rounded-full border-30" />

								<div className="relative z-10 space-y-6">
									<div>
										<p className="text-primary-foreground text-2xl font-semibold">
											Mjakazi Connect
										</p>
										<span className="bg-accent/20 text-primary-foreground mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold tracking-widest uppercase">
											Kenya&apos;s Trusted Domestic Help Platform
										</span>
									</div>

									<h2 className="text-primary-foreground max-w-xs text-3xl leading-snug font-semibold">
										Find trusted help.
										<br />
										Get found by the right home.
									</h2>

									<p className="text-primary-foreground/70 max-w-sm text-sm leading-relaxed">
										A verified directory connecting professional wajakazi with
										Kenya&apos;s households, securely, transparently, and on your terms.
									</p>

									<ul className="space-y-3 pt-4">
										{[
											"Document-verified profiles",
											"NDPA 2019 compliant",
											"No subscription auto-renewals, ever",
										].map((item) => (
											<li key={item} className="flex items-center gap-3">
												<span className="bg-accent size-1.5 shrink-0 rounded-full" />
												<span className="text-primary-foreground/70 text-sm">{item}</span>
											</li>
										))}
									</ul>
								</div>

								<p className="text-primary-foreground/40 relative z-10 text-xs">
									© {new Date().getFullYear()} Mjakazi Connect Limited
								</p>
							</div>

							{/* auth form area */}
							<div className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
								{/* mobile brand strip */}
								<div className="bg-primary mb-6 w-full max-w-md rounded-xl px-6 py-4 lg:hidden">
									<p className="text-primary-foreground text-lg font-semibold">
										Mjakazi Connect
									</p>
									<span className="bg-accent/20 text-primary-foreground mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-widest uppercase">
										Kenya&apos;s Trusted Domestic Help Platform
									</span>
								</div>

								<main className="w-full max-w-md">{children}</main>
							</div>
						</div>
					</ThemeProvider>
				</body>
			</html>
		</ClerkProvider>
	);
};

export { AuthLayout as default, metadata };
