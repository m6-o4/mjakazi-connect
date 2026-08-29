import Link from "next/link";

import type { Role } from "@/lib/roles";

type SidebarProps = {
	role: Role;
};

// role-specific navigation. intentionally minimal for now — each phase adds its
// own nav items (profile, verification, directory, etc.) as those features land
const Sidebar = ({ role }: SidebarProps) => {
	return (
		<aside className="border-border bg-card flex w-60 shrink-0 flex-col border-r">
			<div className="border-border border-b px-5 py-5">
				<p className="text-heading text-lg font-semibold">Mjakazi Connect</p>
				<p className="text-muted-foreground mt-0.5 text-xs capitalize">
					{role} dashboard
				</p>
			</div>
			<nav className="flex flex-1 flex-col gap-1 p-3">
				<Link
					href={`/dashboard/${role}`}
					className="bg-primary/10 text-primary rounded-lg px-3 py-2 text-sm font-medium"
				>
					Overview
				</Link>
			</nav>
		</aside>
	);
};

export { Sidebar };
