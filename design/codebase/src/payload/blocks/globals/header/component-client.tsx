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
		<nav className="border-border-subtle bg-bg-white/80 fixed z-50 w-full border-b backdrop-blur-md">
			<Container className="py-0">
				<div className="flex h-20 items-center justify-between">
					{/* branding section with logo icon and organization name */}
					<Link href="/" className="flex cursor-pointer items-center">
						{organizationLogo && typeof organizationLogo === "object" && (
							<Image
								src={organizationLogo.url || ""}
								alt={organizationLogo.alt || ""}
								width={organizationLogo.width || 32}
								height={organizationLogo.height || 32}
								className="mr-3 size-8 rounded-lg object-contain"
								priority
							/>
						)}
						<span className="font-display text-text-default text-xl font-bold tracking-tight">
							{main} {accent && <span className="text-brand-primary">{accent}</span>}
						</span>
					</Link>

					{/* desktop navigation menu hidden on smaller screens */}
					<div className="hidden items-center space-x-8 lg:flex">
						{navigationItems?.map(({ link }, index) => (
							<Link
								key={index}
								href={link.url || "#"}
								className="text-brand-primary text-sm font-medium transition-colors"
							>
								{link.label || "#"}
							</Link>
						))}

						<div className="bg-border mx-2 h-4 w-px"></div>

						{authorization?.link && (
							<Link
								href={authorization?.link.url || "#"}
								className="text-text-default hover:text-brand-primary text-sm font-medium"
							>
								{authorization?.link.label || "#"}
							</Link>
						)}

						{register?.link && (
							<Button
								asChild
								className="bg-brand-primary text-primary-foreground shadow-brand-primary/20 hover:bg-brand-primary-light focus-visible:ring-brand-primary inline-flex items-center justify-center rounded-lg px-5 py-2 text-sm font-medium shadow-lg transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
							>
								<Link href={register?.link.url || "#"}>
									{register?.link.label || "#"}
								</Link>
							</Button>
						)}
					</div>

					{/* mobile slide-out menu trigger and content */}
					<Sheet open={isOpen} onOpenChange={setIsOpen}>
						<SheetTrigger asChild className="lg:hidden">
							<Button variant="ghost" size="icon">
								<Menu className="size-6" />
							</Button>
						</SheetTrigger>

						<SheetContent
							side="right"
							className="border-border-subtle bg-bg-white w-full border-t p-6 shadow-xl"
						>
							<nav className="mt-8 flex flex-col space-y-6">
								{navigationItems?.map(({ link }, index) => (
									<Link
										key={index}
										href={link.url || "#"}
										className="text-text-default block w-full text-left font-medium"
									>
										{link.label || "#"}
									</Link>
								))}

								{authorization?.link && (
									<Link
										href={authorization?.link.url || "#"}
										className="text-text-default block w-full text-left font-medium"
									>
										{authorization?.link.label || "#"}
									</Link>
								)}

								{register?.link && (
									<Button
										asChild
										className="bg-brand-primary inline-flex w-full items-center justify-center rounded-lg px-6 py-3 font-medium text-white shadow-lg"
									>
										<Link href={register?.link.url || "#"}>
											{register?.link.label || "#"}
										</Link>
									</Button>
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
