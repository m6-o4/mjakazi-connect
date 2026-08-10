import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Bell } from "lucide-react";

interface DashboardTopbarProps {
	title: string;
	notificationCount?: number;
}

const DashboardTopbar = ({ title, notificationCount }: DashboardTopbarProps) => {
	return (
		<header className="border-border bg-background sticky top-0 z-40 flex h-14 items-center gap-3 border-b px-4">
			<SidebarTrigger className="-ml-1" />
			<Separator orientation="vertical" className="h-5" />
			<h1 className="font-display text-foreground text-base font-semibold">{title}</h1>
			<div className="ml-auto flex items-center gap-2">
				{/* show notification bell if count provided */}
				{notificationCount !== undefined && (
					<Button variant="ghost" size="icon" className="relative size-8">
						<Bell className="size-4" />
						{notificationCount > 0 && (
							<span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full text-[10px] font-bold">
								{notificationCount > 9 ? "9+" : notificationCount}
							</span>
						)}
					</Button>
				)}
			</div>
		</header>
	);
};

export { DashboardTopbar };
