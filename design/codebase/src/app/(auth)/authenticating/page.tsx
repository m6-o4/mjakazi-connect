"use client";

import { useUser } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const Page = () => {
	const router = useRouter();
	const { isLoaded, isSignedIn, user } = useUser();
	const hasRun = useRef(false);

	useEffect(() => {
		if (!isLoaded || !isSignedIn || !user) return;
		if (hasRun.current) return;
		hasRun.current = true;

		const processRole = async () => {
			const currentRole = user.publicMetadata?.role as string | undefined;

			// if role is already set in publicMetadata we are done
			if (currentRole) {
				router.replace("/post-auth");
				return;
			}

			// read intended role from sessionStorage — set before oauth redirect
			const intendedRole = sessionStorage.getItem("intended_role");
			const role = intendedRole === "mwajiri" ? "mwajiri" : "mjakazi";

			try {
				// promote role to publicMetadata server-side
				await fetch("/apis/auth/assign-role", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ role }),
				});

				// clear sessionStorage after use
				sessionStorage.removeItem("intended_role");
			} catch {
				// proceed anyway — webhook will handle what it can
			}

			router.replace("/post-auth");
		};

		processRole();
	}, [isLoaded, isSignedIn, user, router]);

	return (
		<div className="bg-bg-subtle flex min-h-screen flex-col items-center justify-center gap-5 px-6">
			<Loader2 className="text-primary size-8 animate-spin" />
			<div className="text-center">
				<p className="text-foreground text-sm font-medium">Preparing your dashboard</p>
				<p className="text-muted-foreground mt-1 text-xs">
					This will only take a moment.
				</p>
			</div>
		</div>
	);
};

export { Page as default };
