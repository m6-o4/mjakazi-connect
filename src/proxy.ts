import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
	matcher: [
		// skip next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// always run for api routes
		"/(api|trpc)(.*)",
		// always run for clerk-specific frontend API routes
		"/__clerk/(.*)",
	],
};
