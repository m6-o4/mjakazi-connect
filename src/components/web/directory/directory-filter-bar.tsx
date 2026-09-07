"use client";

import { Search, SlidersHorizontal, X } from "lucide-react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type Option = { label: string; value: string };

const EXPERIENCE_OPTIONS: Option[] = [
	{ value: "0-2", label: "0–2 years" },
	{ value: "3-5", label: "3–5 years" },
	{ value: "6-9", label: "6–9 years" },
	{ value: "10+", label: "10+ years" },
];

type DirectoryFilterBarProps = {
	jobs: readonly Option[];
	locations: readonly Option[];
	current: {
		category?: string;
		location?: string;
		experience?: string;
		q?: string;
	};
	resultCount: number;
	basePath?: string;
};

// the directory filter bar. every filter lives in the URL query string, so a
// filtered view is shareable and server-rendered. it fires `directory_searched`
// once per distinct filter state with the server-computed result count
const DirectoryFilterBar = ({
	jobs,
	locations,
	current,
	resultCount,
	basePath = "/directory",
}: DirectoryFilterBarProps) => {
	const router = useRouter();

	const category = current.category ?? "";
	const location = current.location ?? "";
	const experience = current.experience ?? "";
	const q = current.q ?? "";

	const [query, setQuery] = useState(q);

	useEffect(() => {
		if (!category && !location && !experience && !q) return;
		posthog.capture("directory_searched", {
			filters: {
				category: category || null,
				location: location || null,
				experience: experience || null,
				q: q || null,
			},
			resultCount,
		});
	}, [category, location, experience, q, resultCount]);

	const navigate = (key: "category" | "location" | "experience" | "q", value: string) => {
		const next: Record<string, string> = {};
		if (category) next.category = category;
		if (location) next.location = location;
		if (experience) next.experience = experience;
		if (q.trim()) next.q = q.trim();

		if (value === "all" || value === "") {
			delete next[key];
		} else {
			next[key] = value;
		}

		const params = new URLSearchParams();
		for (const [k, v] of Object.entries(next)) params.set(k, v);

		const queryString = params.toString();
		router.push(queryString ? `${basePath}?${queryString}` : basePath);
	};

	const clearAll = () => {
		setQuery("");
		router.push(basePath);
	};

	const hasActiveFilter = Boolean(category || location || experience || q);

	return (
		<div className="flex flex-col gap-4">
			<form
				onSubmit={(event) => {
					event.preventDefault();
					navigate("q", query.trim());
				}}
				className="flex w-full gap-2"
			>
				<div className="border-input focus-within:border-ring focus-within:ring-ring/50 flex h-10 flex-1 items-center gap-3 rounded-lg border px-3 transition-colors focus-within:ring-3">
					<Search className="text-muted-foreground size-4 shrink-0" />
					<Input
						value={query}
						onChange={(event) => setQuery(event.target.value)}
						placeholder="Search wajakazi by name"
						aria-label="Search wajakazi by name"
						className="h-full flex-1 border-0 bg-transparent p-0 shadow-none ring-0 focus-visible:ring-0"
					/>
				</div>
				<Button type="submit">Search</Button>
			</form>

			<div className="flex flex-wrap items-center gap-3">
				<SlidersHorizontal className="text-muted-foreground hidden size-4 sm:block" />

				<Select
					value={category || "all"}
					onValueChange={(value) => navigate("category", value ?? "all")}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="All jobs" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All jobs</SelectItem>
						{jobs.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={location || "all"}
					onValueChange={(value) => navigate("location", value ?? "all")}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="All locations" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All locations</SelectItem>
						{locations.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				<Select
					value={experience || "all"}
					onValueChange={(value) => navigate("experience", value ?? "all")}
				>
					<SelectTrigger className="w-44">
						<SelectValue placeholder="Any experience" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">Any experience</SelectItem>
						{EXPERIENCE_OPTIONS.map((option) => (
							<SelectItem key={option.value} value={option.value}>
								{option.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{hasActiveFilter ? (
					<Button variant="ghost" size="sm" onClick={clearAll} className="gap-1">
						<X className="size-4" />
						Clear
					</Button>
				) : null}

				<p className="text-muted-foreground ml-auto text-sm">
					{resultCount} {resultCount === 1 ? "profile" : "profiles"}
				</p>
			</div>
		</div>
	);
};

export { DirectoryFilterBar };
