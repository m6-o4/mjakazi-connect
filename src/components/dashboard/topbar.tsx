import { MobileNav } from "@/components/dashboard/mobile-nav";
import { SignOutButton } from "@/components/dashboard/sign-out-button";
import type { User } from "@/payload-types";

type TopbarProps = {
	user: User;
};

const Topbar = ({ user }: TopbarProps) => {
	return (
		<header className="border-border flex h-16 shrink-0 items-center justify-between border-b px-4 md:px-6">
			<div className="flex items-center gap-2">
				<MobileNav role={user.role} />
				<p className="text-heading text-base font-semibold md:hidden">Mjakazi Connect</p>
			</div>
			<div className="flex items-center gap-4">
				<div className="text-right">
					<p className="text-foreground text-sm font-medium">{user.name}</p>
					<p className="text-muted-foreground hidden text-xs sm:block">{user.email}</p>
				</div>
				<SignOutButton />
			</div>
		</header>
	);
};

export { Topbar };
