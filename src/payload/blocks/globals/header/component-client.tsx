"use client";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import type { Header } from "@/payload-types";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface HeaderClientProps {
	data: Header;
}

// manages the interactive navigation experience including mobile menu states and branding
const HeaderClient = ({ data }: HeaderClientProps) => {
	const [isOpen, setIsOpen] = useState(false);
	const { organizationName, organizationLogo, navigationItems, authorization, register } =
		data;
	const parts = (organizationName ?? "").split("|").map((s) => s.trim());
	const [main, accent] = parts.length > 1 ? parts : [organizationName ?? "", null];

	return (
		<nav className="border-border bg-card/80 fixed z-50 w-full border-b backdrop-blur-md">
			<Container className="py-px">
				<div className="flex h-20 items-center justify-between">
					{/* branding section with logo icon and organization name */}
					<Link href="/" className="flex cursor-pointer items-center">
						{organizationLogo && typeof organizationLogo === "object" && (
							<Image
								src={organizationLogo.url || ""}
								alt={organizationLogo.alt || ""}
								width={organizationLogo.width || 160}
								height={organizationLogo.height || 80}
								className="mr-3 hidden h-20 w-40 object-contain lg:flex"
								priority
							/>
						)}
						<span className="text-foreground text-xl font-bold tracking-tight">
							{main} {accent && <span className="text-primary">{accent}</span>}
						</span>
					</Link>

					{/* desktop navigation menu hidden on smaller screens */}
					<div className="hidden items-center space-x-8 lg:flex">
						{navigationItems?.map(({ link }, index) => (
							<Link
								key={index}
								href={link.url || "#"}
								className="text-foreground hover:text-primary text-sm font-medium transition-colors"
							>
								{link.label || "#"}
							</Link>
						))}

						<div className="bg-border mx-2 h-4 w-px"></div>

						{authorization?.link && (
							<Link
								href={authorization?.link.url || "#"}
								className="text-foreground hover:text-primary text-sm font-medium"
							>
								{authorization?.link.label || "#"}
							</Link>
						)}

						{register?.link && (
							<Button
								render={
									<Link href={register?.link.url || "#"}>
										{register?.link.label || "#"}
									</Link>
								}
								nativeButton={false}
								size="lg"
								className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
							/>
						)}
					</div>

					{/* mobile slide-out menu trigger and content */}
					<Sheet open={isOpen} onOpenChange={setIsOpen}>
						<SheetTrigger
							render={
								<Button variant="ghost" size="icon" className="lg:hidden">
									<Menu className="size-6" />
								</Button>
							}
						/>

						<SheetContent
							side="right"
							className="border-border bg-card w-full border-t p-6 shadow-xl"
						>
							<nav className="mt-8 flex flex-col space-y-6">
								{navigationItems?.map(({ link }, index) => (
									<Link
										key={index}
										href={link.url || "#"}
										className="text-foreground block w-full text-left font-medium"
									>
										{link.label || "#"}
									</Link>
								))}

								{authorization?.link && (
									<Link
										href={authorization?.link.url || "#"}
										className="text-foreground block w-full text-left font-medium"
									>
										{authorization?.link.label || "#"}
									</Link>
								)}

								{register?.link && (
									<Button
										render={
											<Link href={register?.link.url || "#"}>
												{register?.link.label || "#"}
											</Link>
										}
										nativeButton={false}
										size="lg"
										className="bg-accent text-accent-foreground hover:bg-accent/90 w-full font-semibold"
									/>
								)}
							</nav>
						</SheetContent>
					</Sheet>
				</div>
			</Container>
		</nav>
	);
};

export { HeaderClient };
