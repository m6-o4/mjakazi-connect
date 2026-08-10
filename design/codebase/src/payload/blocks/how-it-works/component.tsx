import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import { HowItWorks } from "@/payload-types";
import { Tally1, Tally2, Tally3 } from "lucide-react";
import { ElementType } from "react";

// maps schema options to theme-specific background colors
const bgMap: Record<string, string> = { subtle: "bg-bg-subtle", white: "bg-bg-white" };

// maps slug values to corresponding lucide-react icons
const iconMap: Record<string, ElementType> = {
	tallyone: Tally1,
	tallytwo: Tally2,
	tallythree: Tally3,
};

// renders a sequence of instructional steps in a responsive grid
const HowItWorksBlock = ({
	backgroundVariant = "white",
	headline,
	headlineDescription,
	workingItems,
}: HowItWorks) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-bg-white";

	return (
		<section id="how-it-works" className={cn("relative py-24", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="mx-auto mb-16 text-center">
					<h2 className="font-display text-text-default mb-4 text-3xl font-bold md:text-4xl">
						{headline}
					</h2>
					<p className="text-muted-foreground text-lg">{headlineDescription}</p>
				</div>

				<div className="relative grid gap-12 md:grid-cols-3">
					{/* decorative line connecting steps on larger viewports to visualize flow */}
					<div className="bg-border absolute top-12 right-[16%] left-[16%] -z-10 hidden h-0.5 md:block"></div>

					{workingItems?.map((item, index) => {
						const iconType = item.workingItem?.workingItemIconType;
						const iconName = item.workingItem?.workingItemIconTypeIcon;
						const IconValue = iconName ? iconMap[iconName] : null;
						const headline = item.workingItem?.workingItemHeadline;
						const description = item.workingItem?.workingItemDescription;

						return (
							<div
								key={index}
								className="group relative flex flex-col items-center text-center"
							>
								{/* container for the step indicator, supporting both numeric text and icon glyphs */}
								<div className="border-brand-primary/10 bg-bg-white group-hover:border-brand-primary/20 mb-6 flex size-24 items-center justify-center rounded-full border-4 shadow-sm transition-colors duration-300">
									<div className="bg-brand-primary/10 text-brand-primary group-hover:bg-brand-primary/20 flex size-12 items-center justify-center rounded-full text-xl font-bold transition-colors duration-300">
										{iconType === "text" && item.workingItem?.workingItemIconTypeText}

										{iconType === "icon" && IconValue && (
											<IconValue className="text-brand-primary size-6 text-center" />
										)}
									</div>
								</div>
								<h3 className="font-display text-text-default mb-3 text-xl font-bold">
									{headline}
								</h3>
								<p className="text-muted-foreground leading-relaxed">{description}</p>
							</div>
						);
					})}
				</div>
			</Container>
		</section>
	);
};

export { HowItWorksBlock };
