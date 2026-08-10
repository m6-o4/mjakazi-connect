import { BookOpen, Briefcase, Calendar, Globe, MapPin, Wallet } from "lucide-react";
import { LANGUAGE_OPTIONS } from "@/lib/profile-constants";
import Link from "next/link";

interface JobLabel {
	label: string;
	icon: string;
}

interface WorkerCardProps {
	id: string;
	displayName: string;
	photoUrl: string | null;
	jobLabels: JobLabel[];
	locationLabel: string | null;
	experience: number | null;
	workPreference: string | null;
	languages: string[];
	salaryMin: number | null;
	salaryMax: number | null;
	educationLevel: string | null;
}

const workPreferenceLabel: Record<string, string> = {
	live_in: "Live-in",
	live_out: "Live-out",
	either: "Live-in or Live-out",
};

const educationLevelLabel: Record<string, string> = {
	primary: "Primary School",
	secondary: "Secondary School",
	certificate: "Certificate",
	diploma: "Diploma",
	degree: "Bachelor's Degree",
	postgraduate: "Postgraduate",
};

const WorkerCard = ({
	id,
	displayName,
	photoUrl,
	jobLabels,
	locationLabel,
	experience,
	workPreference,
	languages,
	salaryMin,
	salaryMax,
	educationLevel,
}: WorkerCardProps) => {
	const firstName = displayName.split(" ")[0];

	const languageLabels = languages
		.map((l) => LANGUAGE_OPTIONS.find((o) => o.value === l)?.label ?? l)
		.slice(0, 3);

	const salaryDisplay =
		salaryMin !== null && salaryMax !== null
			? `KSh ${salaryMin.toLocaleString()} – ${salaryMax.toLocaleString()} / mo`
			: salaryMin !== null
				? `From KSh ${salaryMin.toLocaleString()} / mo`
				: salaryMax !== null
					? `Up to KSh ${salaryMax.toLocaleString()} / mo`
					: null;

	return (
		<div className="bg-card border-border flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-md">
			{/* render photo and summary info */}
			<div className="flex gap-4 p-5">
				{/* worker image */}
				<div className="relative shrink-0">
					<div className="bg-muted size-32 overflow-hidden rounded-xl">
						{photoUrl ? (
							<img
								src={photoUrl}
								alt={`${firstName}'s profile`}
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="bg-primary/10 flex h-full w-full items-center justify-center">
								<span className="text-primary/40 font-display text-2xl font-bold">
									{firstName[0]?.toUpperCase() ?? "?"}
								</span>
							</div>
						)}
					</div>
					{/* display verified status */}
					<div className="absolute -right-1 -bottom-1 rounded-full bg-white p-0.5">
						<div className="bg-accent flex size-4 items-center justify-center rounded-full">
							<span className="text-accent-foreground text-[8px] font-bold">✓</span>
						</div>
					</div>
				</div>

				{/* render worker details */}
				<div className="flex min-w-0 flex-1 flex-col gap-1">
					<h3 className="font-display text-foreground text-base leading-tight font-bold">
						{displayName}
					</h3>

					{workPreference && (
						<div className="text-muted-foreground flex items-center gap-1 text-xs">
							<Briefcase className="size-3 shrink-0" />
							<span>{workPreferenceLabel[workPreference] ?? workPreference}</span>
						</div>
					)}

					{locationLabel && (
						<div className="text-muted-foreground flex items-center gap-1 text-xs">
							<MapPin className="size-3 shrink-0" />
							<span>{locationLabel}</span>
						</div>
					)}

					{experience !== null && experience !== undefined && (
						<div className="text-muted-foreground flex items-center gap-1 text-xs">
							<Calendar className="size-3 shrink-0" />
							<span>{experience === 1 ? "1 year" : `${experience} years`} exp</span>
						</div>
					)}

					{educationLevel && (
						<div className="text-muted-foreground flex items-center gap-1 text-xs">
							<BookOpen className="size-3 shrink-0" />
							<span>{educationLevelLabel[educationLevel] ?? educationLevel}</span>
						</div>
					)}

					{salaryDisplay && (
						<div className="text-muted-foreground flex items-center gap-1 text-xs">
							<Wallet className="size-3 shrink-0" />
							<span>{salaryDisplay}</span>
						</div>
					)}
				</div>
			</div>

			{/* render job category tags */}
			{jobLabels.length > 0 && (
				<div className="flex flex-wrap gap-1.5 px-4 pb-3">
					{jobLabels.map(({ label, icon }) => (
						<span
							key={label}
							className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
						>
							{icon && <span className="text-[10px]">{icon}</span>}
							{label}
						</span>
					))}
				</div>
			)}

			{/* list spoken languages */}
			{languageLabels.length > 0 && (
				<div className="flex flex-wrap gap-1.5 px-4 pb-3">
					{languageLabels.map((lang) => (
						<span
							key={lang}
							className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
						>
							<Globe className="size-3" />
							{lang}
						</span>
					))}
				</div>
			)}

			{/* render navigation to profile */}
			<div className="border-border mt-auto border-t px-4 py-3">
				<Link
					href={`/dashboard/mwajiri/browse/${id}`}
					className="bg-primary text-primary-foreground hover:bg-primary/90 flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
				>
					View Full Profile
				</Link>
			</div>
		</div>
	);
};

export { WorkerCard };
