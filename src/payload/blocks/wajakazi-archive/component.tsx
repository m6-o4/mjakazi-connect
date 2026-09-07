import { ArrowRight, Users } from "lucide-react";
import Link from "next/link";
import { getPayload } from "payload";

import { Container } from "@/components/container";
import { Card, CardContent } from "@/components/ui/card";
import { DirectoryCard } from "@/components/web/directory/directory-card";
import { cn } from "@/lib/utils";
import config from "@/payload-config";
import type { WajakaziArchive } from "@/payload-types";
import { listDirectoryProfiles } from "@/services/directory.service";

type WajakaziArchiveBlockProps = WajakaziArchive & { id?: string };

const bgMap: Record<string, string> = {
	background: "bg-background",
	muted: "bg-primary/10",
};

// marketing block that showcases the latest verified wajakazi using the same
// card and guarded data path as the public directory, capped at three profiles
const WajakaziArchiveBlock = async (props: WajakaziArchiveBlockProps) => {
	const {
		id,
		headline,
		headlineDescription,
		showViewAllLink = true,
		backgroundVariant = "muted",
	} = props;

	const backgroundClass = bgMap[backgroundVariant] ?? "bg-primary/10";

	const payload = await getPayload({ config });

	const { docs: profiles } = await listDirectoryProfiles(payload, { limit: 3 });

	return (
		<div className={cn("px-4 py-20", backgroundClass)}>
			<Container className="px-4 sm:px-6 lg:px-8">
				<div className="px-3" id={`block-${id}`}>
					{(headline || headlineDescription) && (
						<div className="mb-12 flex flex-col items-end justify-between md:flex-row">
							<div>
								{headline ? (
									<h2 className="text-heading mb-4 text-3xl font-semibold md:text-4xl">
										{headline}
									</h2>
								) : null}
								{headlineDescription ? (
									<p className="text-muted-foreground">{headlineDescription}</p>
								) : null}
							</div>
							{showViewAllLink ? (
								<Link
									href="/directory"
									className="border-primary/20 text-primary hover:bg-primary/10 mt-6 hidden items-center justify-center rounded-lg border px-6 py-3 font-medium transition-all duration-200 md:mt-0 md:inline-flex"
								>
									View all wajakazi <ArrowRight className="ml-2 h-4 w-4" />
								</Link>
							) : null}
						</div>
					)}

					{profiles.length === 0 ? (
						<Card className="py-10">
							<CardContent className="flex flex-col items-center justify-center gap-3 text-center">
								<Users className="text-muted-foreground/40 size-10" />
								<p className="text-muted-foreground text-sm">
									No verified wajakazi available yet. Check back soon.
								</p>
							</CardContent>
						</Card>
					) : (
						<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
							{profiles.map((profile) => (
								<DirectoryCard key={profile.id} profile={profile} />
							))}
						</div>
					)}

					{showViewAllLink && profiles.length > 0 ? (
						<div className="mt-10 flex justify-center md:hidden">
							<Link
								href="/directory"
								className="border-primary/20 text-primary hover:bg-primary/10 mt-6 inline-flex items-center justify-center rounded-lg border px-6 py-3 font-medium transition-all duration-200"
							>
								View all wajakazi <ArrowRight className="ml-2 h-4 w-4" />
							</Link>
						</div>
					) : null}
				</div>
			</Container>
		</div>
	);
};

export { WajakaziArchiveBlock };
