import { Container } from "@/components/container";
import { CMSLink } from "@/components/link";
import { cn } from "@/lib/utils";
import { Pricing } from "@/payload-types";
import { Check } from "lucide-react";

// map background variants to css classes for easy styling
const bgMap: Record<string, string> = { subtle: "bg-bg-subtle", white: "bg-bg-white" };

const PricingBlock = ({
	backgroundVariant = "subtle",
	headline,
	headlineDescription,
	pricing,
}: Pricing) => {
	// default to subtle background if variant is not found
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-bg-subtle";
	const plans = pricing?.pricingPlans || [];

	return (
		<section
			id="pricing"
			className={cn("border-border-subtle border-t py-24", backgroundClass)}
		>
			<Container className="px-4 sm:px-6 lg:px-8">
				{/* header section with headline and description */}
				<div className="mx-auto mb-16 text-center">
					<h2 className="font-display text-text-default mb-4 text-3xl font-bold md:text-4xl">
						{headline}
					</h2>
					<p className="text-muted-foreground text-lg">{headlineDescription}</p>
				</div>

				{/* grid layout for pricing cards, responsive from 1 to 3 columns */}
				<div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-3 lg:gap-12">
					{plans.map((plan, index) => {
						const isPopular = plan.mostPopular;

						return (
							<div
								key={plan.id || index}
								className={cn(
									"flex flex-col rounded-2xl border p-8 transition-all duration-300",
									// highlight popular plan with brand color and elevation
									isPopular
										? "border-brand-primary bg-card relative transform border-2 shadow-xl md:-translate-y-4"
										: "border-border hover:border-brand-primary/30 bg-card hover:shadow-lg",
								)}
							>
								{/* badge for most popular plan */}
								{isPopular && (
									<div className="absolute top-0 right-0 left-0 -mt-4 flex justify-center">
										<span className="bg-brand-primary text-primary-foreground rounded-full px-3 py-1 text-xs font-bold tracking-wide uppercase">
											Most Popular
										</span>
									</div>
								)}

								<div className="mb-6">
									<h3 className="text-text-default text-lg font-bold">{plan.planName}</h3>
									<p className="text-muted-foreground mt-2 text-sm">
										{plan.planDescription}
									</p>
								</div>
								<div className="mb-8">
									<span className="font-display text-text-default text-4xl font-bold">
										{plan.planPrice}
									</span>
								</div>
								{/* list of perks with checkmarks */}
								<ul className="mb-8 flex-1 space-y-4">
									{plan.planPerks?.map((perkItem, i) => (
										<li key={perkItem.id || i} className="flex items-start">
											{isPopular ? (
												<div className="bg-brand-primary/10 mr-3 rounded-full p-0.5">
													<Check className="text-brand-primary size-4" />
												</div>
											) : (
												<Check className="text-brand-primary mr-3 size-5 shrink-0" />
											)}
											<span
												className={cn(
													"text-sm",
													isPopular
														? "text-text-default font-medium"
														: "text-muted-foreground",
												)}
											>
												{perkItem.perk}
											</span>
										</li>
									))}
								</ul>

								{/* call-to-action button, styled differently for popular plan */}
								{plan.ctaPrice?.link && (
									<CMSLink
										{...plan.ctaPrice.link}
										className={cn(
											"inline-flex w-full items-center justify-center rounded-lg px-6 py-3 font-medium transition-all duration-200",
											isPopular
												? "bg-brand-primary text-primary-foreground shadow-brand-primary/20 hover:bg-brand-primary-light shadow-lg"
												: "border-brand-primary/20 text-brand-primary hover:bg-brand-primary/10 border",
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
