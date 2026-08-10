import { DeleteUserAction } from "@/components/dashboard/accounts/delete-user-action";
import { User } from "lucide-react";

interface WaajiriAccount {
	id: string;
	clerkId: string;
	displayName: string;
	email: string;
	createdAt: string;
}

interface WaajiriAccountsTableProps {
	accounts: WaajiriAccount[];
	// viewerRole gates deletion — only super-admins may remove employer accounts
	viewerRole: "admin" | "sa";
}

const WaajiriAccountsTable = ({ accounts, viewerRole }: WaajiriAccountsTableProps) => {
	// show a friendly empty state rather than an empty container
	if (accounts.length === 0) {
		return (
			<div className="bg-card border-border flex flex-col items-center justify-center rounded-xl border p-12 text-center">
				<div className="bg-muted mb-4 flex size-14 items-center justify-center rounded-2xl">
					<User className="text-muted-foreground size-6" />
				</div>
				<p className="font-display text-foreground text-base font-semibold">
					No Waajiri accounts
				</p>
				<p className="text-muted-foreground mt-1 text-sm">
					Registered employers will appear here.
				</p>
			</div>
		);
	}

	return (
		<div className="bg-card border-border overflow-hidden rounded-xl border">
			{/* header summarises how many employers are currently registered */}
			<div className="border-border border-b px-6 py-4">
				<p className="font-display text-foreground text-base font-semibold">
					Waajiri Accounts
				</p>
				<p className="text-muted-foreground mt-0.5 text-sm">
					{accounts.length} employer
					{accounts.length !== 1 ? "s" : ""} registered
				</p>
			</div>

			<div className="divide-border divide-y">
				{accounts.map((account) => {
					// deletion is restricted to super-admins to prevent accidental data loss
					const canDelete = viewerRole === "sa";

					return (
						<div
							key={account.id}
							className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between"
						>
							{/* identity — initials avatar, name, email, join date */}
							<div className="flex items-center gap-3">
								{/* waajiri accounts have no profile photo, so initials are always used */}
								<div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-full">
									<span className="text-primary text-xs font-bold">
										{account.displayName
											.split(" ")
											.map((n) => n[0])
											.join("")
											.slice(0, 2)
											.toUpperCase()}
									</span>
								</div>
								<div>
									<p className="text-foreground text-sm font-semibold">
										{account.displayName}
									</p>
									<p className="text-muted-foreground text-xs">{account.email}</p>
									<p className="text-muted-foreground text-xs">
										Joined{" "}
										{new Date(account.createdAt).toLocaleDateString("en-KE", {
											day: "numeric",
											month: "short",
											year: "numeric",
										})}
									</p>
								</div>
							</div>

							{/* delete action is only rendered for super-admins */}
							{canDelete && (
								<div className="shrink-0">
									<DeleteUserAction
										clerkId={account.clerkId}
										role="mwajiri"
										displayName={account.displayName}
									/>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export { WaajiriAccountsTable };
