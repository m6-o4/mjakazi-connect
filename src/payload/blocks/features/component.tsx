import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import { Features } from "@/payload-types";
import { Lock, ShieldCheck, Users } from "lucide-react";
import { ElementType } from "react";

const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

const iconMap: Record<string, ElementType> = {
	lock: Lock,
	shieldcheck: ShieldCheck,
	users: Users,
};

const FeaturesBlock = ({
	backgroundVariant = "background",
	featureItems,
	headline,
	headlineDescription,
}: Features) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-background";

	return (
		<section id="features" className={cn("py-24", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="mx-auto mb-16 text-center">
					<h2 className="text-heading mb-4 text-3xl font-semibold md:text-4xl">
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
								<div className="bg-primary/10 mb-6 flex size-12 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110">
									{iconType === "text" && item.featureItem?.featureItemIconTypeText}

									{iconType === "icon" && IconValue && (
										<IconValue className="text-primary size-6" />
									)}
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

export { FeaturesBlock };
