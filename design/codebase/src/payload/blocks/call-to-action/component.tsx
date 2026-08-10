import { CallToAction } from "@/payload-types";

// renders a high-impact call to action section with two primary navigation paths
const CallToActionBlock = ({ calltoaction }: CallToAction) => {
	// ensures data validity before attempting to render properties
	if (!calltoaction || typeof calltoaction !== "object") return null;

	const { ctaDirectory, ctaRegister, headline, headlineDescription } = calltoaction;

	return (
		<section className="bg-brand-primary relative overflow-hidden py-24">
			{/* decorative background elements for visual depth */}
			<div className="bg-brand-primary-light absolute top-0 right-0 -mt-20 -mr-20 h-96 w-96 rounded-full opacity-50 blur-3xl"></div>
			<div className="bg-brand-primary-light absolute bottom-0 left-0 -mb-20 -ml-20 h-96 w-96 rounded-full opacity-50 blur-3xl"></div>

			<div className="relative mx-auto px-4 text-center sm:px-6 lg:px-8">
				<h2 className="font-display text-primary-foreground mb-6 text-4xl font-bold sm:text-5xl">
					{headline}
				</h2>
				<p className="text-primary-foreground/90 mx-auto mb-10 text-lg sm:text-xl">
					{headlineDescription}
				</p>
				<div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
					{/* renders registration button if link data is present */}
					{ctaRegister.link && (
						<a
							href={ctaRegister.link.url || "#"}
							className="bg-bg-white text-brand-primary border-brand-primary-light hover:bg-brand-primary-light w-full rounded-lg border px-8 py-4 text-center font-bold shadow-lg shadow-black/10 transition-colors hover:text-white sm:w-auto"
						>
							{ctaRegister.link.label || "#"}
						</a>
					)}

					{/* renders directory button as a secondary action path */}
					{ctaDirectory.link && (
						<a
							href={ctaDirectory.link.url || "#"}
							className="border-brand-primary-light text-primary-foreground hover:bg-brand-primary-light w-full rounded-lg border bg-transparent px-8 py-4 text-center font-medium transition-colors sm:w-auto"
						>
							{ctaDirectory.link.label || "#"}
						</a>
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
