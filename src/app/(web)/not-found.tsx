import Link from "next/link";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";

const NotFound = () => {
	return (
		<Container>
			<div className="flex min-h-[55vh] flex-col items-center justify-center px-4 text-center">
				<h1 className="text-heading mb-4 text-6xl font-bold">404</h1>
				<h2 className="text-heading mb-4 text-2xl font-semibold">Page Not Found</h2>
				<p className="text-foreground mb-8">
					Sorry! The page you are looking for either does not exist or has been moved.
				</p>

				<Button
					render={<Link href="/">Return to Homepage</Link>}
					nativeButton={false}
					size="lg"
					className="bg-accent text-accent-foreground hover:bg-accent/90 font-semibold"
				/>
			</div>
		</Container>
	);
};

export { NotFound as default };
