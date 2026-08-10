import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import Link from "next/link";

/**
 * renders a custom 404 error page template.
 * this provides a user-friendly view when a page is not found.
 */
const NotFound = () => {
	return (
		<Container>
			{/* sets up a minimum height and centers the content both vertically and horizontally. */}
			<div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
				{/* large, primary error code. */}
				<h1 className="text-primary mb-4 text-6xl font-bold">404</h1>
				{/* explanatory heading. */}
				<h2 className="text-primary mb-4 text-2xl font-semibold">page not found</h2>
				{/* descriptive message giving the user context. */}
				<p className="text-foreground mb-8">
					Sorry! The page you are looking for either does not exist or has been moved.
				</p>

				{/* cta button to redirect the user back to the main homepage. */}
				<Button className="rounded-lg font-semibold uppercase" variant="default" asChild>
					<Link href="/">Go to Homepage</Link>
				</Button>
			</div>
		</Container>
	);
};

export { NotFound as default };
