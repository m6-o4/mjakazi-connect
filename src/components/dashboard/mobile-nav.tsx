"use client";

import { useState } from "react";
import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { getNavItems } from "@/lib/dashboard-nav";
import type { Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

type MobileNavProps = {
	role: Role;
};

// mobile navigation: a hamburger in the topbar opens the same nav as the
// sidebar, in a left sheet. visible only below md
const MobileNav = ({ role }: MobileNavProps) => {
	const [open, setOpen] = useState(false);
	const pathname = usePathname();
	const items = getNavItems(role);

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger
				className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}
			>
				<MenuIcon />
				<span className="sr-only">Open menu</span>
			</SheetTrigger>
			<SheetContent side="left" className="w-64 p-0">
				<SheetHeader className="border-border border-b">
					<SheetTitle>Mjakazi Connect</SheetTitle>
				</SheetHeader>
				<nav className="flex flex-col gap-1 p-3">
					{items.map((item) => {
						const active = pathname === item.href;
						return (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => setOpen(false)}
								className={cn(
									"rounded-lg px-3 py-2 text-sm font-medium",
									active
										? "bg-primary/10 text-primary"
										: "text-foreground hover:bg-muted",
								)}
							>
								{item.label}
							</Link>
						);
					})}
				</nav>
			</SheetContent>
		</Sheet>
	);
};

export { MobileNav };
