import { Check } from "lucide-react";

import { Container } from "@/components/container";
import { CMSLink } from "@/components/payload/link";
import { cn } from "@/lib/utils";
import { Pricing } from "@/payload-types";

const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

const PricingBlock = ({
	backgroundVariant = "background",
	headline,
	headlineDescription,
	pricing,
}: Pricing) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-background";
	const plans = pricing?.pricingPlans || [];

	return (
		<section id="pricing" className={cn("border-border border-t py-24", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="mx-auto mb-16 text-center">
					<h2 className="text-heading mb-4 text-3xl font-semibold md:text-4xl">
						{headline}
					</h2>
					<p className="text-muted-foreground text-lg">{headlineDescription}</p>
				</div>

				<div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3 lg:gap-12">
					{plans.map((plan, index) => {
						const isPopular = plan.mostPopular;

						return (
							<div
								key={plan.id || index}
								className={cn(
									"flex flex-col rounded-2xl border p-8 transition-all duration-300",
									isPopular
										? "border-primary bg-card relative transform border-2 shadow-xl md:-translate-y-4"
										: "border-border hover:border-primary/30 bg-card hover:shadow-lg",
								)}
							>
								{isPopular && (
									<div className="absolute top-0 right-0 left-0 -mt-4 flex justify-center">
										<span className="bg-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
											Most Popular
										</span>
									</div>
								)}

								<div className="mb-6">
									<h3 className="text-heading text-lg font-semibold">{plan.planName}</h3>
									<p className="text-muted-foreground mt-2 text-sm">
										{plan.planDescription}
									</p>
								</div>
								<div className="mb-8">
									<span className="text-heading text-4xl font-bold">
										{plan.planPrice}
									</span>
								</div>
								{/* list of perks with checkmarks */}
								<ul className="mb-8 flex-1 space-y-4">
									{plan.planPerks?.map((perkItem, i) => (
										<li key={perkItem.id || i} className="flex items-start">
											{isPopular ? (
												<div className="bg-primary/10 mr-3 rounded-full p-0.5">
													<Check className="text-primary size-4" />
												</div>
											) : (
												<Check className="text-primary mr-3 size-5 shrink-0" />
											)}
											<span
												className={cn(
													"text-sm",
													isPopular
														? "text-foreground font-medium"
														: "text-muted-foreground",
												)}
											>
												{perkItem.perk}
											</span>
										</li>
									))}
								</ul>

								{plan.ctaPrice?.link && (
									<CMSLink
										{...plan.ctaPrice.link}
										className={cn(
											"inline-flex w-full items-center justify-center rounded-lg px-6 py-3 font-medium transition-all duration-200",
											isPopular
												? "bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/80 shadow-lg"
												: "border-primary/20 text-primary hover:bg-primary/10 border",
										)}
									/>
								)}
							</div>
						);
					})}
				</div>
			</Container>
		</section>
	);
};

export { PricingBlock };
