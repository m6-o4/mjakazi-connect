import { Container } from "@/components/container";
import { cn } from "@/lib/utils";
import { Testimonials } from "@/payload-types";
import { Quote, Star } from "lucide-react";

const bgMap: Record<string, string> = {
	subtle: "bg-bg-subtle",
	white: "bg-bg-white",
};

const TestimonialsBlock = ({
	backgroundVariant = "white",
	headline,
	headlineDescription,
	testimonies,
}: Testimonials) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-bg-white";

	return (
		<section id="testimonials" className={cn("py-24", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="mx-auto mb-16 text-center">
					<h2 className="font-display text-text-default mb-4 text-3xl font-bold md:text-4xl">
						{headline}
					</h2>
					<p className="text-muted-foreground text-lg">{headlineDescription}</p>
				</div>

				<div className="grid gap-8 md:grid-cols-3">
					{testimonies?.map((testimony) => (
						<div
							key={testimony.id}
							className="bg-card hover:bg-brand-primary/5 relative rounded-2xl p-8 transition-colors duration-300"
						>
							<Quote className="text-brand-primary/20 absolute top-6 right-6 size-10" />

							<div className="mb-6 flex space-x-1">
								{[...Array(5)].map((_, i) => (
									<Star
										key={i}
										className={`size-5 ${
											i < (testimony.rating ?? 0)
												? "fill-current text-yellow-400"
												: "text-muted-foreground/30"
										}`}
									/>
								))}
							</div>

							<p className="text-muted-foreground relative z-10 mb-8 text-lg leading-relaxed">
								{testimony.testimony}
							</p>

							<div className="mt-auto flex items-center">
								<div className="ml-1">
									<h4 className="text-text-default font-bold">{testimony.name}</h4>
									<p className="text-muted-foreground text-sm">
										{testimony.occupation}
										{testimony.location ? ` • ${testimony.location}` : ""}
									</p>
								</div>
							</div>
						</div>
					))}
				</div>
			</Container>
		</section>
	);
};

export { TestimonialsBlock };
