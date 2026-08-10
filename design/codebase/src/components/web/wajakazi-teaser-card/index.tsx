import { Briefcase, Calendar, MapPin } from "lucide-react";
import { JOB_OPTIONS } from "@/lib/profile-constants";
import Link from "next/link";

interface WajakaziTeaserCardProps {
	firstName: string;
	photoUrl: string | null;
	jobLabels: string[];
	locationLabel: string | null;
	experience: number | null;
	workPreference: string | null;
	buttonLink: string;
	buttonText: string;
}

const workPreferenceLabel: Record<string, string> = {
	live_in: "Live-in",
	live_out: "Live-out",
	either: "Live-in or Live-out",
};

const WajakaziTeaserCard = ({
	firstName,
	photoUrl,
	jobLabels,
	locationLabel,
	experience,
	workPreference,
	buttonLink,
	buttonText,
}: WajakaziTeaserCardProps) => {
	return (
		<div className="group border-border-subtle hover:border-brand-primary/30 flex flex-col overflow-hidden rounded-2xl border bg-white transition-all duration-300 hover:shadow-md">
			{/* render photo and summary info */}
			<div className="flex gap-4 p-5">
				{/* worker image */}
				<div className="relative shrink-0">
					<div className="bg-muted size-32 overflow-hidden rounded-xl">
						{photoUrl ? (
							<img
								src={photoUrl}
								alt={`${firstName}'s profile`}
								className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
							/>
						) : (
							<div className="from-brand-primary/10 to-brand-primary/5 flex h-full w-full items-center justify-center bg-linear-to-br">
								<span className="text-brand-primary/40 font-display text-2xl font-bold">
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
					<h3 className="font-display text-text-default text-base leading-tight font-bold">
						{firstName}
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
							<span>
								{experience === 1 ? "1 year" : `${experience} years`} experience
							</span>
						</div>
					)}
				</div>
			</div>

			{/* render job category tags */}
			{jobLabels.length > 0 && (
				<div className="flex flex-wrap gap-1.5 px-4 pb-3">
					{jobLabels.map((label) => {
						const jobOption = JOB_OPTIONS.find((o) => o.label === label);
						return (
							<span
								key={label}
								className="border-border text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs"
							>
								{jobOption?.icon && <span className="text-[10px]">{jobOption.icon}</span>}
								{label}
							</span>
						);
					})}
				</div>
			)}

			{/* render call to action */}
			<div className="border-border-subtle mt-auto border-t px-4 py-3">
				<Link
					href={buttonLink}
					className="bg-brand-primary text-primary-foreground hover:bg-brand-primary-light flex w-full items-center justify-center rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
				>
					{buttonText}
				</Link>
				<p className="text-muted-foreground mt-2 text-center text-xs">
					Already have a Mwajiri account?{" "}
					<Link
						href="/sign-in"
						className="text-brand-primary font-medium hover:underline"
					>
						Sign in
					</Link>
				</p>
			</div>
		</div>
	);
};

export { WajakaziTeaserCard };
