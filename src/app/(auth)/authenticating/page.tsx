import { AuthenticatingClient } from "@/components/auth/authenticating-client";

type Args = {
	searchParams: Promise<{ action?: string }>;
};

// the wait screen between the clerk form and the dashboard. reads the action so
// it can show "Signing you in…" or "Creating your account…"
const AuthenticatingPage = async ({ searchParams }: Args) => {
	const { action } = await searchParams;
	const message = action === "sign-up" ? "Creating your account…" : "Signing you in…";

	return <AuthenticatingClient message={message} />;
};

export { AuthenticatingPage as default };
