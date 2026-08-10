"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

const Page = () => {
	const params = useSearchParams();
	const roleParam = params.get("role");

	// default to mjakazi (worker) when no role is specified in the URL
	const role = roleParam === "mwajiri" ? "mwajiri" : "mjakazi";

	useEffect(() => {
		// only persist to sessionStorage when the role is explicitly in the URL —
		// Clerk performs internal redirects during sign-up that re-render this page
		// without the query param, which would overwrite a previously stored "mwajiri"
		if (roleParam) {
			sessionStorage.setItem("intended_role", role);
		}
	}, [roleParam, role]);

	return (
		// forceRedirectUrl bypasses Clerk's default post-sign-up destination so we
		// can run our own role-assignment logic at /authenticating before routing the user
		<SignUp
			forceRedirectUrl="/authenticating"
			// role is embedded in unsafeMetadata so it's available on the Clerk user
			// object immediately after sign-up, before our webhook fires
			unsafeMetadata={{ role }}
			appearance={{
				// override Clerk's default card shell so the form blends into the page layout
				elements: {
					rootBox: "w-full",
					card: "shadow-none border-none bg-transparent p-0",
					headerTitle: "font-display text-xl font-bold text-foreground",
					headerSubtitle: "text-muted-foreground text-sm",
					socialButtonsBlockButton:
						"border-border bg-background text-foreground hover:bg-muted text-sm font-medium",
					formFieldLabel: "text-xs font-medium text-muted-foreground",
					formFieldInput:
						"border-border bg-background text-foreground text-sm rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary",
					formButtonPrimary:
						"bg-primary hover:bg-brand-primary-light text-primary-foreground text-sm font-semibold rounded-lg",
					footerActionText: "text-muted-foreground text-xs",
					footerActionLink: "text-primary font-medium text-xs",
					dividerLine: "bg-border",
					dividerText: "text-muted-foreground text-xs",
				},
			}}
		/>
	);
};

export { Page as default };
