import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { CallToAction } from "@/payload-types";

// renders a high-impact call to action section with two primary navigation paths
const CallToActionBlock = ({ calltoaction }: CallToAction) => {
	if (!calltoaction || typeof calltoaction !== "object") return null;

	const { ctaDirectory, ctaRegister, headline, headlineDescription } = calltoaction;

	return (
		<section className="bg-primary relative overflow-hidden py-24">
			<div className="absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full bg-[color-mix(in_oklch,var(--primary),var(--background)_40%)] opacity-50 blur-3xl"></div>
			<div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-96 w-96 rounded-full bg-[color-mix(in_oklch,var(--primary),var(--background)_40%)] opacity-50 blur-3xl"></div>

			<div className="relative mx-auto px-4 text-center sm:px-6 lg:px-8">
				<h2 className="text-primary-foreground mb-6 text-4xl font-semibold sm:text-5xl">
					{headline}
				</h2>
				<p className="text-primary-foreground/90 mx-auto mb-10 text-lg sm:text-xl">
					{headlineDescription}
				</p>
				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					{ctaDirectory.link && (
						<Button
							render={
								<Link href={ctaDirectory.link.url || "#"}>
									{ctaDirectory.link.label || "#"}
								</Link>
							}
							nativeButton={false}
							variant="outline"
							className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 h-auto w-full rounded-lg bg-transparent px-6 py-3 font-medium shadow-sm transition-all duration-200 sm:w-auto"
						/>
					)}

					{ctaRegister.link && (
						<Button
							render={
								<Link href={ctaRegister.link.url || "#"}>
									{ctaRegister.link.label || "#"}
									<ArrowRight className="ml-2 size-4 transition-transform group-hover/button:translate-x-1" />
								</Link>
							}
							nativeButton={false}
							className="bg-card text-primary hover:bg-card/90 h-auto w-full gap-0 rounded-lg px-6 py-3 font-medium shadow-lg transition-all duration-200 sm:w-auto"
						/>
					)}
				</div>
				<p className="text-primary-foreground/70 mt-6 text-sm opacity-80">
					No payment is required to browse profiles.
				</p>
			</div>
		</section>
	);
};

export { CallToActionBlock };
