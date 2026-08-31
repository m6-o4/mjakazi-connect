"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { getNavItems } from "@/lib/dashboard-nav";
import type { Role } from "@/lib/roles";

type SidebarProps = {
	role: Role;
};

// desktop navigation rail. hidden below md — on mobile the same nav lives in a
// sheet triggered from the topbar (see mobile-nav.tsx)
const Sidebar = ({ role }: SidebarProps) => {
	const pathname = usePathname();
	const items = getNavItems(role);

	return (
		<aside className="border-border bg-card hidden w-60 shrink-0 flex-col border-r md:flex">
			<div className="border-border border-b px-5 py-5">
				<p className="text-heading text-lg font-semibold">Mjakazi Connect</p>
				<p className="text-muted-foreground mt-0.5 text-xs capitalize">
					{role} dashboard
				</p>
			</div>
			<nav className="flex flex-1 flex-col gap-1 p-3">
				{items.map((item) => {
					const active = pathname === item.href;
					return (
						<Link
							key={item.href}
							href={item.href}
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
		</aside>
	);
};

export { Sidebar };
