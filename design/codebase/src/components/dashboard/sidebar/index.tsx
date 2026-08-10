"use client";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuBadge,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarSeparator,
} from "@/components/ui/sidebar";
import { SignOutButton, useUser } from "@clerk/nextjs";
import {
	ChevronUp,
	CreditCard,
	FileText,
	Inbox,
	LayoutDashboard,
	LogOut,
	LucideIcon,
	Search,
	Settings,
	ShieldCheck,
	User,
	Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavigationItem {
	title: string;
	href: string;
	icon: LucideIcon;
	badge?: string;
}

interface NavigationSection {
	label: string;
	items: NavigationItem[];
}

const mjakaziNavigation: NavigationSection[] = [
	{
		label: "Main",
		items: [
			{
				title: "Dashboard",
				href: "/dashboard/mjakazi",
				icon: LayoutDashboard,
			},
		],
	},
	{
		label: "Profile",
		items: [
			{
				title: "My Profile",
				href: "/dashboard/mjakazi/profile",
				icon: User,
			},
			{
				title: "My Documents",
				href: "/dashboard/mjakazi/documents",
				icon: FileText,
			},
			{
				title: "Verification",
				href: "/dashboard/mjakazi/verification",
				icon: ShieldCheck,
			},
			{
				title: "Opportunities",
				href: "/dashboard/mjakazi/opportunities",
				icon: Inbox,
			},
		],
	},
	{
		label: "Account",
		items: [
			{
				title: "Settings",
				href: "/dashboard/mjakazi/settings",
				icon: Settings,
			},
		],
	},
];

const mwajiriNavigation: NavigationSection[] = [
	{
		label: "Main",
		items: [
			{
				title: "Dashboard",
				href: "/dashboard/mwajiri",
				icon: LayoutDashboard,
			},
		],
	},
	{
		label: "Discover",
		items: [
			{
				title: "Browse Wajakazi",
				href: "/dashboard/mwajiri/browse",
				icon: Search,
			},
		],
	},
	{
		label: "Account",
		items: [
			{
				title: "Subscription",
				href: "/dashboard/mwajiri/subscription",
				icon: CreditCard,
			},
			{
				title: "Settings",
				href: "/dashboard/mwajiri/settings",
				icon: Settings,
			},
		],
	},
];

const buildAdminNavigation = (pendingCount: number): NavigationSection[] => [
	{
		label: "Main",
		items: [
			{
				title: "Dashboard",
				href: "/dashboard/admin",
				icon: LayoutDashboard,
			},
		],
	},
	{
		label: "Moderation",
		items: [
			{
				title: "Pending Verifications",
				href: "/dashboard/admin/verifications",
				icon: ShieldCheck,
				badge: pendingCount > 0 ? String(pendingCount) : undefined,
			},
			{
				title: "Accounts",
				href: "/dashboard/admin/accounts",
				icon: User,
			},
			{
				title: "Audit Logs",
				href: "/dashboard/admin/audit-logs",
				icon: FileText,
			},
		],
	},
	{
		label: "Account",
		items: [
			{
				title: "Settings",
				href: "/dashboard/admin/settings",
				icon: Settings,
			},
		],
	},
];

const buildSaNavigation = (pendingCount: number): NavigationSection[] => [
	{
		label: "Main",
		items: [
			{
				title: "Dashboard",
				href: "/dashboard/sa",
				icon: LayoutDashboard,
			},
		],
	},
	{
		label: "Moderation",
		items: [
			{
				title: "Pending Verifications",
				href: "/dashboard/sa/verifications",
				icon: ShieldCheck,
				badge: pendingCount > 0 ? String(pendingCount) : undefined,
			},
			{
				title: "Accounts",
				href: "/dashboard/sa/accounts",
				icon: User,
			},
			{
				title: "Audit Logs",
				href: "/dashboard/sa/audit-logs",
				icon: FileText,
			},
		],
	},
	{
		label: "System",
		items: [
			{
				title: "Staff Management",
				href: "/dashboard/sa/staff",
				icon: Users,
			},
			{
				title: "Settings",
				href: "/dashboard/sa/settings",
				icon: Settings,
			},
		],
	},
];

// determines the visual indicator for the verification nav item
const getVerificationIndicator = (status: string) => {
	const actionNeeded = [
		"draft",
		"pending_payment",
		"rejected",
		"verification_expired",
	].includes(status);

	if (actionNeeded) {
		return (
			<span className="relative ml-auto flex size-2.5">
				<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
				<span className="relative inline-flex size-2.5 rounded-full bg-amber-400" />
			</span>
		);
	}

	if (status === "verified") {
		return (
			<span className="bg-accent relative ml-auto inline-flex size-2.5 rounded-full" />
		);
	}

	// pending_review, blacklisted, deactivated — no indicator
	return null;
};

interface DashboardSidebarProps {
	role: "mjakazi" | "mwajiri" | "admin" | "sa";
	pendingVerificationCount?: number;
	verificationStatus?: string;
}

const dashboardLabelMap = {
	mjakazi: "Mjakazi Dashboard",
	mwajiri: "Mwajiri Dashboard",
	admin: "Admin Dashboard",
	sa: "Super Admin Dashboard",
};

const roleLabelMap = {
	mjakazi: "Mjakazi",
	mwajiri: "Mwajiri",
	admin: "Admin",
	sa: "Super Admin",
};

const DashboardSidebar = ({
	role,
	pendingVerificationCount = 0,
	verificationStatus = "draft",
}: DashboardSidebarProps) => {
	const pathname = usePathname();
	const { user } = useUser();

	const navigation: NavigationSection[] =
		role === "admin"
			? buildAdminNavigation(pendingVerificationCount)
			: role === "sa"
				? buildSaNavigation(pendingVerificationCount)
				: role === "mjakazi"
					? mjakaziNavigation
					: mwajiriNavigation;

	const dashboardLabel = dashboardLabelMap[role];
	const roleLabel = roleLabelMap[role];

	const initials =
		[user?.firstName, user?.lastName]
			.filter(Boolean)
			.map((n) => n![0].toUpperCase())
			.join("") || "MC";

	const displayName =
		[user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
		user?.emailAddresses[0]?.emailAddress ||
		"User";

	return (
		<Sidebar>
			<SidebarHeader className="border-sidebar-border border-b px-4 py-4">
				<div className="flex items-center gap-3">
					<div className="bg-primary flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
						<span className="font-display text-primary-foreground text-xs font-bold">
							MC
						</span>
					</div>
					<div className="min-w-0">
						<p className="font-display text-sidebar-foreground truncate text-sm font-bold">
							Mjakazi Connect
						</p>
						<p className="text-sidebar-foreground/50 text-[10px] font-medium tracking-wide">
							{dashboardLabel}
						</p>
					</div>
				</div>
			</SidebarHeader>

			<SidebarContent className="px-2 py-2">
				{navigation.map((section, i) => (
					<SidebarGroup key={section.label}>
						{i > 0 && <SidebarSeparator className="mb-2" />}
						<SidebarGroupLabel className="text-sidebar-foreground/50 text-[10px] font-semibold tracking-widest">
							{section.label}
						</SidebarGroupLabel>
						<SidebarMenu>
							{section.items.map((item) => {
								const isActive = pathname.startsWith(item.href);

								// verification item gets a dynamic indicator
								// for mjakazi role only
								const isVerificationItem =
									role === "mjakazi" && item.href === "/dashboard/mjakazi/verification";

								return (
									<SidebarMenuItem key={item.href}>
										<SidebarMenuButton
											asChild
											isActive={isActive}
											className="gap-3 text-sm"
										>
											<Link href={item.href}>
												<item.icon className="size-4 shrink-0" />
												<span>{item.title}</span>

												{/* dynamic verification indicator */}
												{isVerificationItem &&
													getVerificationIndicator(verificationStatus)}

												{/* standard text badge for admin counts */}
												{!isVerificationItem && item.badge && (
													<SidebarMenuBadge className="bg-accent text-accent-foreground ml-auto">
														{item.badge}
													</SidebarMenuBadge>
												)}
											</Link>
										</SidebarMenuButton>
									</SidebarMenuItem>
								);
							})}
						</SidebarMenu>
					</SidebarGroup>
				))}
			</SidebarContent>

			<SidebarFooter className="border-sidebar-border border-t p-3">
				<SidebarMenu>
					<SidebarMenuItem>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<SidebarMenuButton className="h-auto gap-3 py-2">
									<Avatar className="size-8 shrink-0">
										<AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
											{initials}
										</AvatarFallback>
									</Avatar>
									<div className="min-w-0 flex-1 text-left">
										<p className="text-sidebar-foreground truncate text-sm font-semibold">
											{displayName}
										</p>
										<p className="text-sidebar-foreground/50 text-[11px]">{roleLabel}</p>
									</div>
									<ChevronUp className="text-sidebar-foreground/40 ml-auto size-4 shrink-0" />
								</SidebarMenuButton>
							</DropdownMenuTrigger>
							<DropdownMenuContent side="top" align="start" className="w-52">
								<SignOutButton>
									<DropdownMenuItem className="cursor-pointer gap-2">
										<LogOut className="size-4" />
										Sign out
									</DropdownMenuItem>
								</SignOutButton>
							</DropdownMenuContent>
						</DropdownMenu>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
		</Sidebar>
	);
};

export { DashboardSidebar };
