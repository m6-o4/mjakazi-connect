import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import {
	Pagination,
	PaginationContent,
	PaginationEllipsis,
	PaginationItem,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type DirectoryPaginationProps = {
	currentPage: number;
	totalPages: number;
	baseParams: {
		category?: string;
		location?: string;
		experience?: string;
		q?: string;
	};
};

// numbered pages with a windowed ellipsis when the directory grows long. the
// current filters are preserved in every link so paging never drops a filter
const getPageRange = (current: number, total: number): (number | "…")[] => {
	if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

	const pages: (number | "…")[] = [1];
	const start = Math.max(2, current - 1);
	const end = Math.min(total - 1, current + 1);

	if (start > 2) pages.push("…");
	for (let page = start; page <= end; page += 1) pages.push(page);
	if (end < total - 1) pages.push("…");
	pages.push(total);

	return pages;
};

const DirectoryPagination = ({
	currentPage,
	totalPages,
	baseParams,
}: DirectoryPaginationProps) => {
	if (totalPages <= 1) return null;

	const buildHref = (page: number): string => {
		const params = new URLSearchParams();
		if (baseParams.category) params.set("category", baseParams.category);
		if (baseParams.location) params.set("location", baseParams.location);
		if (baseParams.experience) params.set("experience", baseParams.experience);
		if (baseParams.q) params.set("q", baseParams.q);
		if (page > 1) params.set("page", String(page));

		const queryString = params.toString();
		return queryString ? `/directory?${queryString}` : "/directory";
	};

	const pages = getPageRange(currentPage, totalPages);

	return (
		<Pagination>
			<PaginationContent>
				{currentPage > 1 ? (
					<PaginationItem>
						<Link
							href={buildHref(currentPage - 1)}
							aria-label="Previous page"
							className={buttonVariants({ variant: "ghost", size: "icon" })}
						>
							<ChevronLeft />
						</Link>
					</PaginationItem>
				) : null}

				{pages.map((page, index) => {
					if (page === "…") {
						return (
							<PaginationItem key={`ellipsis-${index}`}>
								<PaginationEllipsis />
							</PaginationItem>
						);
					}

					const isCurrent = page === currentPage;

					return (
						<PaginationItem key={page}>
							{isCurrent ? (
								<span
									aria-current="page"
									className={cn(
										buttonVariants({ variant: "outline", size: "icon" }),
										"bg-primary/10 text-primary font-semibold",
									)}
								>
									{page}
								</span>
							) : (
								<Link
									href={buildHref(page)}
									className={buttonVariants({ variant: "outline", size: "icon" })}
								>
									{page}
								</Link>
							)}
						</PaginationItem>
					);
				})}

				{currentPage < totalPages ? (
					<PaginationItem>
						<Link
							href={buildHref(currentPage + 1)}
							aria-label="Next page"
							className={buttonVariants({ variant: "ghost", size: "icon" })}
						>
							<ChevronRight />
						</Link>
					</PaginationItem>
				) : null}
			</PaginationContent>
		</Pagination>
	);
};

export { DirectoryPagination };
