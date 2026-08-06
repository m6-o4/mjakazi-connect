import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import { HowItWorks } from "@/payload-types";
import { Tally1, Tally2, Tally3 } from "lucide-react";
import { ElementType } from "react";

const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

const iconMap: Record<string, ElementType> = {
	tallyone: Tally1,
	tallytwo: Tally2,
	tallythree: Tally3,
};

const HowItWorksBlock = ({
	backgroundVariant = "background",
	headline,
	headlineDescription,
	workingItems,
}: HowItWorks) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-background";

	return (
		<section id="how-it-works" className={cn("relative py-24", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="mx-auto mb-16 text-center">
					<h2 className="text-heading mb-4 text-3xl font-semibold md:text-4xl">
						{headline}
					</h2>
					<p className="text-muted-foreground text-lg">{headlineDescription}</p>
				</div>

				<div className="relative grid gap-12 md:grid-cols-3">
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
								<div className="border-primary/10 bg-card group-hover:border-primary/20 mb-6 flex size-24 items-center justify-center rounded-full border-4 shadow-sm transition-colors duration-300">
									<div className="bg-primary/10 text-primary group-hover:bg-primary/20 flex size-12 items-center justify-center rounded-full text-xl font-bold transition-colors duration-300">
										{iconType === "text" && item.workingItem?.workingItemIconTypeText}

										{iconType === "icon" && IconValue && (
											<IconValue className="text-primary size-6 text-center" />
										)}
									</div>
								</div>
								<h3 className="text-heading mb-3 text-xl font-semibold">{headline}</h3>
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
