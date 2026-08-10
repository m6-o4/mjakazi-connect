import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import { Features } from "@/payload-types";
import { Lock, ShieldCheck, Users } from "lucide-react";
import { ElementType } from "react";

// maps theme-specific background variants to tailwind utility classes
const bgMap: Record<string, string> = { subtle: "bg-bg-subtle", white: "bg-bg-white" };

// registry of lucide icons available for selection within the grid items
const iconMap: Record<string, ElementType> = {
	lock: Lock,
	shieldcheck: ShieldCheck,
	users: Users,
};

// renders a feature or content grid with support for icons, text labels, and custom backgrounds
const FeaturesBlock = ({
	backgroundVariant = "white",
	featureItems,
	headline,
	headlineDescription,
}: Features) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-bg-white";

	return (
		<section id="features" className={cn("py-24", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="mx-auto mb-16 text-center">
					<h2 className="font-display text-text-default mb-4 text-3xl font-bold md:text-4xl">
						{headline}
					</h2>
					<p className="text-muted-foreground text-lg">{headlineDescription}</p>
				</div>

				<div className="grid gap-12 md:grid-cols-3">
					{featureItems?.map((item, index) => {
						const iconType = item.featureItem?.featureItemIconType;
						const iconName = item.featureItem?.featureItemIconTypeIcon;
						const IconValue = iconName ? iconMap[iconName] : null;
						const headline = item.featureItem?.featureItemHeadline;
						const description = item.featureItem?.featureItemDescription;

						return (
							<div key={index} className="group">
								<div className="bg-brand-primary/10 mb-6 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
									{/* handles conditional rendering of either text label or an icon */}
									{iconType === "text" && item.featureItem?.featureItemIconTypeText}

									{iconType === "icon" && IconValue && (
										<IconValue className="text-brand-primary size-6" />
									)}
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

export { FeaturesBlock };
