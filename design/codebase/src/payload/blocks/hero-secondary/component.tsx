import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import { HeroSecondary } from "@/payload-types";

// maps cms variant values to tailwind background utility classes
const bgMap: Record<string, string> = {
	subtle: "bg-bg-subtle",
	white: "bg-bg-white",
};

// provides a compact page header with increased top offset for standard content pages
const HeroSecondaryBlock = ({
	backgroundVariant = "white",
	heroDescription,
	heroHeadline,
}: HeroSecondary) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-bg-white";

	return (
		<section className={cn("py-12 pt-28", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				{/* emphasizes page identity with bold display typography */}
				<h1 className="font-display text-text-default text-3xl font-bold md:text-4xl">
					{heroHeadline}
				</h1>
				{/* provides supporting context using secondary text colors for hierarchy */}
				<p className="text-muted-foreground mt-3">{heroDescription}</p>
			</Container>
		</section>
	);
};

export { HeroSecondaryBlock };
