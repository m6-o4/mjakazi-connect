"use client";

import { SignUp } from "@clerk/nextjs";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

const SignUpPage = () => {
	const router = useRouter();
	const params = useParams();
	const searchParams = useSearchParams();

	const role = searchParams.get("role");
	const segments = params?.["sign-up"];
	const isClerkSubRoute = Array.isArray(segments) && segments.length > 0;
	const isValidRole = role === "mjakazi" || role === "mwajiri";

	// no role parameter renders the chooser — it never guesses. only the base
	// path is guarded; clerk's internal sub-routes (sso-callback, verify email)
	// carry no query param and must be left alone or the oauth flow breaks
	const shouldRedirect = !isClerkSubRoute && !isValidRole;

	useEffect(() => {
		if (shouldRedirect) {
			router.replace("/registration");
		}
	}, [shouldRedirect, router]);

	if (shouldRedirect) {
		return null;
	}

	return (
		<SignUp
			forceRedirectUrl="/post-auth"
			unsafeMetadata={isValidRole ? { role } : undefined}
			appearance={{
				elements: {
					rootBox: "w-full",
					card: "shadow-none border-none bg-transparent p-0",
					headerTitle: "text-heading text-xl font-semibold",
					headerSubtitle: "text-muted-foreground text-sm",
					// google oauth is disabled — hide the social button and its divider
					socialButtonsRoot: "hidden",
					dividerRow: "hidden",
					formFieldLabel: "text-xs font-medium text-muted-foreground",
					formFieldInput:
						"border-border bg-background text-foreground text-sm rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary",
					formButtonPrimary:
						"bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-semibold rounded-lg",
					footerActionText: "text-muted-foreground text-xs",
					footerActionLink: "text-primary font-medium text-xs",
				},
			}}
		/>
	);
};

export { SignUpPage as default };
