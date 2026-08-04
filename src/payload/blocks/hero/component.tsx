/* eslint-disable @next/next/no-img-element */
import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import { Hero } from "@/payload-types";
import { ArrowRight, CheckCircle } from "lucide-react";

// maps cms variant values to tailwind background utility classes
const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

const HeroBlock = ({
	backgroundVariant = "background",
	ctaMjakazi,
	ctaRegistration,
	heroDescription,
	heroHeadline,
	heroOverline,
	heroType = "primary",
}: Hero) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-background";

	// compact page header used on internal pages
	if (heroType === "secondary") {
		return (
			<section className={cn("py-12 pt-28", backgroundClass)}>
				<Container className="px-4 sm:px-6 lg:px-8">
					{/* emphasizes page identity with bold display typography */}
					<h1 className="text-heading text-3xl font-bold md:text-4xl">{heroHeadline}</h1>
					{/* provides supporting context using secondary text colors for hierarchy */}
					<p className="text-muted-foreground mt-3">{heroDescription}</p>
				</Container>
			</section>
		);
	}

	// enables dynamic accent styling within the headline via a delimiter character
	const parts = (heroHeadline ?? "").split("|").map((s) => s.trim());
	const [main, accent] = parts.length > 1 ? parts : [heroHeadline ?? "", null];

	return (
		<section
			id="home"
			className={cn("overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-24", backgroundClass)}
		>
			<Container className="relative px-4 sm:px-6 lg:px-8">
				<div className="items-center lg:grid lg:grid-cols-12 lg:gap-16">
					<div className="text-center lg:col-span-6 lg:text-left">
						{/* small descriptive badge to signal platform status or category */}
						<div className="border-primary/20 bg-primary/10 text-primary mb-6 inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wider uppercase">
							<CheckCircle className="mr-2 size-3" />
							{heroOverline}
						</div>
						{/* dynamic headline with gradient support for emphasized segments */}
						<h1 className="text-heading mb-6 text-5xl leading-[1.1] font-bold sm:text-6xl lg:text-7xl">
							{main} {accent && <span className="text-accent">{accent}</span>}
						</h1>
						{/* main value proposition text with optimized line height for readability */}
						<p className="text-muted-foreground mx-auto mb-8 text-lg leading-relaxed sm:text-xl lg:mx-0">
							{heroDescription}
						</p>
						<div className="flex flex-col items-center justify-center gap-4 sm:flex-row lg:justify-start">
							{/* primary call-to-action for immediate contractor engagement */}
							{ctaMjakazi?.link && (
								<a
									href={ctaMjakazi.link.url || "#"}
									className="group bg-primary hover:bg-primary/80 text-primary-foreground inline-flex w-full items-center justify-center rounded-lg px-6 py-3 font-medium shadow-lg transition-all duration-200 sm:w-auto"
								>
									{ctaMjakazi.link.label || "#"}
									<ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-1" />
								</a>
							)}
							{/* secondary call-to-action for service provider onboarding */}
							{ctaRegistration?.link && (
								<a
									href={ctaRegistration.link.url || "#"}
									className="text-primary hover:border-primary/20 hover:bg-primary/5 border-border bg-card inline-flex w-full items-center justify-center rounded-lg border px-6 py-3 font-medium shadow-sm transition-all duration-200 sm:w-auto"
								>
									{ctaRegistration.link.label || "#"}
								</a>
							)}
						</div>
						{/* emphasizes platform credibility through verified performance metrics */}
						<div className="border-border mt-10 flex items-center justify-center space-x-8 border-t pt-8 lg:justify-start">
							<div className="flex flex-col">
								<span className="text-heading text-2xl font-bold">2k+</span>
								<span className="text-muted-foreground text-sm">Active Wajakazi</span>
							</div>
							<div className="bg-border h-8 w-px"></div>
							<div className="flex flex-col">
								<span className="text-heading text-2xl font-bold">98%</span>
								<span className="text-muted-foreground text-sm">Satisfaction Rate</span>
							</div>
						</div>
					</div>
					{/* decorative visual representation of the contractor verification process */}
					<div className="relative mt-16 lg:col-span-6 lg:mt-0">
						<div className="absolute -inset-4 -rotate-2 transform rounded-4xl bg-linear-to-r from-[color-mix(in_oklch,var(--primary),var(--foreground)_25%)] to-[color-mix(in_oklch,var(--primary),var(--background)_25%)] opacity-10"></div>
						<div className="border-border bg-card relative overflow-hidden rounded-2xl border shadow-2xl">
							<div className="border-border bg-primary flex items-center space-x-2 border-b px-4 py-3">
								<div className="size-3 rounded-full bg-red-400"></div>
								<div className="size-3 rounded-full bg-yellow-400"></div>
								<div className="size-3 rounded-full bg-green-400"></div>
							</div>
							<div className="p-6">
								<div className="mb-6 flex items-center justify-between">
									<h3 className="text-heading font-bold">Recent Matches</h3>
									<span className="text-primary text-sm font-medium">View All</span>
								</div>
								<div className="space-y-4">
									<div className="hover:border-primary/20 hover:bg-primary/5 border-border flex items-center rounded-xl border p-3 transition-colors">
										<div className="bg-border size-12 shrink-0 overflow-hidden rounded-full">
											<img
												src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=100&h=100"
												alt="User"
												className="h-full w-full object-cover"
											/>
										</div>
										<div className="ml-4 flex-1">
											<div className="flex items-center justify-between">
												<p className="text-foreground font-semibold">Verified Mjakazi</p>
												<span className="border-primary/20 bg-primary/10 text-primary inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
													Available
												</span>
											</div>
											<p className="text-muted-foreground text-sm">Nairobi • 4.9 Stars</p>
										</div>
										<button
											className="hover:text-primary text-muted-foreground ml-4 p-2"
											aria-label="Open"
										>
											<i data-lucide="chevron-right" className="size-5"></i>
										</button>
									</div>
									<div className="hover:border-primary/20 hover:bg-primary/5 border-border flex items-center rounded-xl border p-3 transition-colors">
										<div className="bg-border h-12 w-12 shrink-0 overflow-hidden rounded-full">
											<img
												src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&q=80&w=100&h=100"
												alt="User"
												className="h-full w-full object-cover"
											/>
										</div>
										<div className="ml-4 flex-1">
											<div className="flex items-center justify-between">
												<p className="text-foreground font-semibold">Verified Mjakazi</p>
												<span className="border-primary/20 bg-primary/10 text-primary inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium">
													Available
												</span>
											</div>
											<p className="text-muted-foreground text-sm">Nairobi • 5.0 Stars</p>
										</div>
										<button
											className="hover:text-primary text-muted-foreground ml-4 p-2"
											aria-label="Open"
										>
											<i data-lucide="chevron-right" className="h-5 w-5"></i>
										</button>
									</div>
								</div>
								{/* communicates platform security measures and background check standards */}
								<div className="border-border bg-primary mt-6 rounded-xl border p-4">
									<div className="flex items-start">
										<i
											data-lucide="lock"
											className="text-primary-foreground/70 mt-0.5 mr-3 h-5 w-5"
										></i>
										<div>
											<p className="text-primary-foreground text-sm font-medium">
												Identity Verification Active
											</p>
											<p className="text-primary-foreground/70 mt-1 text-xs">
												We verify ID, Certificate of Good Conduct, and references for
												every mjakazi.
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</Container>
		</section>
	);
};

export { HeroBlock };
