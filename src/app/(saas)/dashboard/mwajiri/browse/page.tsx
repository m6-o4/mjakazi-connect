import { Users } from "lucide-react";
import type { Metadata } from "next";
import { getPayload } from "payload";

import { Card, CardContent } from "@/components/ui/card";
import { DirectoryCard } from "@/components/web/directory/directory-card";
import { DirectoryFilterBar } from "@/components/web/directory/directory-filter-bar";
import { DirectoryPagination } from "@/components/web/directory/directory-pagination";
import { JOB_OPTIONS, LOCATION_OPTIONS } from "@/lib/profile-constants";
import config from "@/payload-config";
import {
	directoryQuerySchema,
	listDirectoryProfiles,
} from "@/services/directory.service";

const metadata: Metadata = { title: "Browse Wajakazi" };

// the mwajiri browse shares the public directory's guarded read path, so the
// data — and the set of absent contact fields — is identical. only the route the
// cards/filters/pagination link into changes
const BROWSE_BASE = "/dashboard/mwajiri/browse";

type Args = {
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const toStr = (value: string | string[] | undefined): string | undefined =>
	Array.isArray(value) ? value[0] : value;

const Page = async ({ searchParams }: Args) => {
	const raw = await searchParams;

	const parsed = directoryQuerySchema.safeParse({
		category: toStr(raw.category),
		location: toStr(raw.location),
		experience: toStr(raw.experience),
		q: toStr(raw.q),
		page: toStr(raw.page),
	});

	const query = parsed.success ? parsed.data : {};
	const payload = await getPayload({ config });
	const result = await listDirectoryProfiles(payload, query);

	const { docs, totalDocs, totalPages, page } = result;

	const active = {
		category: query.category,
		location: query.location,
		experience: query.experience,
		q: query.q,
	};

	const hasActiveFilter = Boolean(
		active.category || active.location || active.experience || active.q,
	);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Browse Wajakazi</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Every profile is document-checked and staff-approved. Contact details unlock
					with an active subscription.
				</p>
			</div>

			<DirectoryFilterBar
				jobs={JOB_OPTIONS}
				locations={LOCATION_OPTIONS}
				current={active}
				resultCount={totalDocs}
				basePath={BROWSE_BASE}
			/>

			<div>
				{docs.length === 0 ? (
					<Card className="py-10">
						<CardContent className="flex flex-col items-center justify-center gap-3 text-center">
							<Users className="text-muted-foreground/40 size-10" />
							<p className="text-muted-foreground text-sm">
								{hasActiveFilter
									? "No wajakazi match your search. Try adjusting the filters."
									: "No verified wajakazi available yet. Check back soon."}
							</p>
						</CardContent>
					</Card>
				) : (
					<div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
						{docs.map((profile) => (
							<DirectoryCard key={profile.id} profile={profile} basePath={BROWSE_BASE} />
						))}
					</div>
				)}
			</div>

			<div>
				<DirectoryPagination
					currentPage={page ?? 1}
					totalPages={totalPages}
					baseParams={active}
					basePath={BROWSE_BASE}
				/>
			</div>
		</div>
	);
};

export { Page as default, metadata };
