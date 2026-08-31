"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

type AuthenticatingClientProps = { message: string };

// shows the wait screen and resolves the post-auth target in the background, so
// the spinner stays up while the role and profile are sorted out
const AuthenticatingClient = ({ message }: AuthenticatingClientProps) => {
	const router = useRouter();
	const hasRun = useRef(false);

	useEffect(() => {
		if (hasRun.current) return;
		hasRun.current = true;

		(async () => {
			try {
				const response = await fetch("/post-auth", { cache: "no-store" });
				const data = (await response.json()) as { redirect?: string };
				router.replace(typeof data.redirect === "string" ? data.redirect : "/sign-in");
			} catch {
				router.replace("/sign-in");
			}
		})();
	}, [router]);

	return (
		<div className="flex flex-col items-center justify-center gap-5 py-16">
			<Loader2 className="text-primary size-8 animate-spin" />
			<div className="text-center">
				<p className="text-foreground text-sm font-medium">{message}</p>
				<p className="text-muted-foreground mt-1 text-xs">
					This will only take a moment.
				</p>
			</div>
		</div>
	);
};

export { AuthenticatingClient };
