"use client";

import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";

import { Container } from "@/components/container";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Registration } from "@/payload-types";

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

	const captureRegistrationStart = (role: "mjakazi" | "mwajiri") => {
		posthog.capture("registration_started", { role });
	};

	return (
		<section className={cn("border-border border-t py-20", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="grid grid-cols-1 gap-8 md:grid-cols-2">
					<Card className="group hover:ring-primary/30 gap-0 p-0 shadow-sm transition-all duration-300 hover:shadow-xl">
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
						<CardContent className="p-6">
							<CardTitle className="text-xl">{mjakaziCard.title}</CardTitle>
							<CardDescription className="mt-2">
								{mjakaziCard.description}
							</CardDescription>
							<div className="mt-6">
								<Button
									render={
										<Link
											href={mjakaziCard.buttonLink || "#"}
											onClick={() => captureRegistrationStart("mjakazi")}
										>
											{mjakaziCard.buttonText}
										</Link>
									}
									nativeButton={false}
									className="bg-primary hover:bg-primary/80 text-primary-foreground h-auto w-full rounded-lg px-6 py-3 font-medium shadow-lg transition-all duration-200 sm:w-auto"
								/>
							</div>
						</CardContent>
					</Card>

					<Card className="group hover:ring-primary/30 gap-0 p-0 shadow-sm transition-all duration-300 hover:shadow-xl">
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
						<CardContent className="p-6">
							<CardTitle className="text-xl">{mwajiriCard.title}</CardTitle>
							<CardDescription className="mt-2">
								{mwajiriCard.description}
							</CardDescription>
							<div className="mt-6">
								<Button
									render={
										<Link
											href={mwajiriCard.buttonLink || "#"}
											onClick={() => captureRegistrationStart("mwajiri")}
										>
											{mwajiriCard.buttonText}
										</Link>
									}
									nativeButton={false}
									className="bg-primary hover:bg-primary/80 text-primary-foreground h-auto w-full rounded-lg px-6 py-3 font-medium shadow-lg transition-all duration-200 sm:w-auto"
								/>
							</div>
						</CardContent>
					</Card>
				</div>
			</Container>
		</section>
	);
};

export { RegistrationBlock };
