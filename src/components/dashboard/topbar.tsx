import { SignOutButton } from "@/components/dashboard/sign-out-button";
import type { User } from "@/payload-types";

type TopbarProps = {
	user: User;
};

const Topbar = ({ user }: TopbarProps) => {
	return (
		<header className="border-border flex h-16 shrink-0 items-center justify-between border-b px-6">
			<div />
			<div className="flex items-center gap-4">
				<div className="text-right">
					<p className="text-foreground text-sm font-medium">{user.name}</p>
					<p className="text-muted-foreground text-xs">{user.email}</p>
				</div>
				<SignOutButton />
			</div>
		</header>
	);
};

export { Topbar };
