import { Quote, Star } from "lucide-react";

import { Container } from "@/components/container";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Testimonials } from "@/payload-types";

const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

const TestimonialsBlock = ({
	backgroundVariant = "background",
	headline,
	headlineDescription,
	testimonies,
}: Testimonials) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-background";

	return (
		<section id="testimonials" className={cn("py-24", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="mx-auto mb-16 text-center">
					<h2 className="text-heading mb-4 text-3xl font-semibold md:text-4xl">
						{headline}
					</h2>
					<p className="text-muted-foreground text-lg">{headlineDescription}</p>
				</div>

				<div className="grid gap-8 md:grid-cols-3">
					{testimonies?.map((testimony) => (
						<Card
							key={testimony.id}
							className="relative gap-0 p-8 transition-all duration-300 hover:ring-primary/30"
						>
							<Quote className="text-primary/20 absolute top-6 right-6 size-10" />

							<CardContent className="flex flex-1 flex-col p-0">
								<div className="mb-6 flex gap-1">
									{[...Array(5)].map((_, i) => (
										<Star
											key={i}
											className={cn(
												"size-5",
												i < (testimony.rating ?? 0)
													? "text-chart-5 fill-current"
													: "text-muted-foreground/30",
											)}
										/>
									))}
								</div>

								<p className="text-muted-foreground relative z-10 mb-8 text-lg leading-relaxed">
									{testimony.testimony}
								</p>

								<div className="mt-auto flex items-center">
									<div className="ml-1">
										<h4 className="text-heading font-semibold">{testimony.name}</h4>
										<p className="text-muted-foreground text-sm">
											{testimony.occupation}
											{testimony.location ? ` • ${testimony.location}` : ""}
										</p>
									</div>
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			</Container>
		</section>
	);
};

export { TestimonialsBlock };
