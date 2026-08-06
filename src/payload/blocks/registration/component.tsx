import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Registration } from "@/payload-types";
import Image from "next/image";
import Link from "next/link";

const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

// provides dual registration pathways for different user personas
const RegistrationBlock = ({
	backgroundVariant = "background",
	mjakaziCard,
	mwajiriCard,
}: Registration) => {
	const backgroundClass = bgMap[backgroundVariant] ?? "bg-background";

	return (
		<section className={cn("border-border border-t py-5", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
					<div className="group border-border bg-card hover:border-primary/20 flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-xl">
						<div className="w-full">
							{mjakaziCard.image && typeof mjakaziCard.image === "object" && (
								<Image
									src={mjakaziCard.image.url || ""}
									alt={mjakaziCard.image.alt || ""}
									width={mjakaziCard.image.width || 800}
									height={mjakaziCard.image.height || 450}
									className="h-auto w-full object-contain"
									priority
								/>
							)}
						</div>
						<div className="p-6">
							<h3 className="text-heading text-xl font-semibold">{mjakaziCard.title}</h3>
							<p className="text-muted-foreground mt-2">{mjakaziCard.description}</p>
							<div className="mt-6">
								<Button
									render={
										<Link href={mjakaziCard.buttonLink || "#"}>
											{mjakaziCard.buttonText}
										</Link>
									}
									nativeButton={false}
									className="bg-primary hover:bg-primary/80 text-primary-foreground h-auto w-full rounded-lg px-6 py-3 font-medium shadow-lg transition-all duration-200 sm:w-auto"
								/>
							</div>
						</div>
					</div>

					<div className="group border-border bg-card hover:border-primary/20 flex flex-col overflow-hidden rounded-2xl border shadow-sm transition-all duration-300 hover:shadow-xl">
						<div className="w-full">
							{mwajiriCard.image && typeof mwajiriCard.image === "object" && (
								<Image
									src={mwajiriCard.image.url || ""}
									alt={mwajiriCard.image.alt || ""}
									width={mwajiriCard.image.width || 800}
									height={mwajiriCard.image.height || 450}
									className="h-auto w-full object-contain"
									priority
								/>
							)}
						</div>
						<div className="p-6">
							<h3 className="text-heading text-xl font-semibold">{mwajiriCard.title}</h3>
							<p className="text-muted-foreground mt-2">{mwajiriCard.description}</p>
							<div className="mt-6">
								<Button
									render={
										<Link href={mwajiriCard.buttonLink || "#"}>
											{mwajiriCard.buttonText}
										</Link>
									}
									nativeButton={false}
									className="bg-primary hover:bg-primary/80 text-primary-foreground h-auto w-full rounded-lg px-6 py-3 font-medium shadow-lg transition-all duration-200 sm:w-auto"
								/>
							</div>
						</div>
					</div>
				</div>
			</Container>
		</section>
	);
};

export { RegistrationBlock };
