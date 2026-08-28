import { redirect } from "next/navigation";

import { SignUp } from "@clerk/nextjs";

type PageProps = {
	params: Promise<{ "sign-up"?: string[] }>;
	searchParams: Promise<{ role?: string | string[] }>;
};

const SignUpPage = async ({ params, searchParams }: PageProps) => {
	const [signUpSegments, search] = await Promise.all([params, searchParams]);
	const role = search.role;

	// clerk navigates internally through sub-routes (e.g. /sign-up/verify-email-address)
	// which re-render this page without the query param. only guard the base path so
	// those sub-routes are never bounced back to the chooser mid-flow.
	const isClerkSubRoute =
		Array.isArray(signUpSegments["sign-up"]) && signUpSegments["sign-up"].length > 0;

	if (!isClerkSubRoute && role !== "mjakazi" && role !== "mwajiri") {
		redirect("/registration");
	}

	return (
		<SignUp
			forceRedirectUrl="/post-auth"
			unsafeMetadata={role === "mjakazi" || role === "mwajiri" ? { role } : undefined}
			appearance={{
				elements: {
					rootBox: "w-full",
					card: "shadow-none border-none bg-transparent p-0",
					headerTitle: "text-heading text-xl font-semibold",
					headerSubtitle: "text-muted-foreground text-sm",
					socialButtonsBlockButton:
						"border-border bg-background text-foreground hover:bg-muted text-sm font-medium",
					formFieldLabel: "text-xs font-medium text-muted-foreground",
					formFieldInput:
						"border-border bg-background text-foreground text-sm rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary",
					formButtonPrimary:
						"bg-primary hover:bg-primary/80 text-primary-foreground text-sm font-semibold rounded-lg",
					footerActionText: "text-muted-foreground text-xs",
					footerActionLink: "text-primary font-medium text-xs",
					dividerLine: "bg-border",
					dividerText: "text-muted-foreground text-xs",
				},
			}}
		/>
	);
};

export { SignUpPage as default };
