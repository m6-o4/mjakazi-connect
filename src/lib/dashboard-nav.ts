import type { Role } from "@/lib/roles";

type NavItem = { href: string; label: string };

// role-specific navigation, shared by the desktop sidebar and the mobile sheet
// so the two can never drift. each phase adds its own items as features land
const NAV_ITEMS_BY_ROLE: Record<Role, NavItem[]> = {
	admin: [
		{ href: "/dashboard/admin", label: "Overview" },
		{ href: "/dashboard/admin/staff", label: "Staff" },
		{ href: "/dashboard/accounts/wajakazi", label: "Wajakazi" },
		{ href: "/dashboard/accounts/waajiri", label: "Waajiri" },
		{ href: "/dashboard/audit-logs", label: "Audit Logs" },
	],
	staff: [
		{ href: "/dashboard/staff", label: "Overview" },
		{ href: "/dashboard/accounts/wajakazi", label: "Wajakazi" },
		{ href: "/dashboard/accounts/waajiri", label: "Waajiri" },
		{ href: "/dashboard/audit-logs", label: "Audit Logs" },
	],
	mwajiri: [{ href: "/dashboard/mwajiri", label: "Overview" }],
	mjakazi: [
		{ href: "/dashboard/mjakazi", label: "Overview" },
		{ href: "/dashboard/mjakazi/profile", label: "Profile" },
		{ href: "/dashboard/mjakazi/documents", label: "Documents" },
	],
};

const getNavItems = (role: Role): NavItem[] => NAV_ITEMS_BY_ROLE[role];

export { getNavItems };
export type { NavItem };
