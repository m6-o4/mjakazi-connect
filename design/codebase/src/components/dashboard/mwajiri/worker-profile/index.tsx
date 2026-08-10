import {
	ArrowLeft,
	BookOpen,
	Briefcase,
	Calendar,
	CheckCircle,
	Clock,
	Globe,
	MapPin,
	Wallet,
} from "lucide-react";
import Link from "next/link";
import { EoiButton } from "@/components/dashboard/mwajiri/eoi-button";

interface JobLabel {
	label: string;
	icon: string;
}

interface WorkerProfileProps {
	profileId: string;
	displayName: string;
	photoUrl: string | null;
	bio: string | null;
	jobLabels: JobLabel[];
	locationLabel: string | null;
	experience: number | null;
	workPreference: string | null;
	languages: string[];
	salaryDisplay: string | null;
	educationLevel: string | null;
	availabilityStatus: string;
	hasExistingEoi: boolean;
}

const workPreferenceLabel: Record<string, string> = {
	live_in: "Live-in (stays with family)",
	live_out: "Live-out (commutes daily)",
	either: "Live-in or Live-out (flexible)",
};

const educationLevelLabel: Record<string, string> = {
	primary: "Primary School",
	secondary: "Secondary School",
	certificate: "Post Secondary Certificate",
	diploma: "Diploma",
	degree: "Bachelor's Degree",
	postgraduate: "Postgraduate",
};

const availabilityLabel: Record<string, { label: string; className: string }> = {
	available: {
		label: "Available for hire",
		className: "bg-accent/10 text-accent",
	},
	hired: {
		label: "Currently hired",
		className: "bg-muted text-muted-foreground",
	},
	on_break: {
		label: "On a break",
		className: "bg-muted text-muted-foreground",
	},
};

// profile display component for mwajiri dashboard
const WorkerProfile = ({
	profileId,
	displayName,
	photoUrl,
	bio,
	jobLabels,
	locationLabel,
	experience,
	workPreference,
	languages,
	salaryDisplay,
	educationLevel,
	availabilityStatus,
	hasExistingEoi,
}: WorkerProfileProps) => {
	const firstName = displayName.split(" ")[0];
	const availability =
		availabilityLabel[availabilityStatus] ?? availabilityLabel.available;

	return (
		<div className="mx-auto w-full max-w-3xl">
			{/* navigation back to browse */}
			<Link
				href="/dashboard/mwajiri/browse"
				className="text-muted-foreground hover:text-foreground mb-6 inline-flex items-center gap-1.5 text-sm transition-colors"
			>
				<ArrowLeft className="size-4" /> Back to Browse
			</Link>

			<div className="bg-card border-border flex flex-col gap-8 rounded-2xl border p-6 sm:p-8">
				{/* worker identity and summary header */}
				<div className="flex flex-col gap-6 sm:flex-row sm:items-start">
					<div className="bg-muted relative aspect-square w-32 shrink-0 overflow-hidden rounded-2xl">
						{photoUrl ? (
							<img
								src={photoUrl}
								alt={`${firstName}'s profile`}
								className="h-full w-full object-cover"
							/>
						) : (
							<div className="bg-primary/10 flex h-full w-full items-center justify-center">
								<span className="text-primary/40 font-display text-4xl font-bold">
									{firstName[0]?.toUpperCase() ?? "?"}
								</span>
							</div>
						)}
					</div>

					<div className="flex flex-1 flex-col gap-3">
						<div className="flex flex-wrap items-center gap-3">
							<h1 className="font-display text-foreground text-2xl font-bold">
								{displayName}
							</h1>
							<span className="bg-accent text-accent-foreground inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold">
								<CheckCircle className="size-3" />
								Verified
							</span>
						</div>

						<span
							className={`inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${availability.className}`}
						>
							<Clock className="size-3" />
							{availability.label}
						</span>

						<div className="flex flex-col gap-1.5">
							{workPreference && (
								<div className="text-muted-foreground flex items-center gap-1.5 text-sm">
									<Briefcase className="size-4 shrink-0" />
									{workPreferenceLabel[workPreference] ?? workPreference}
								</div>
							)}
							{locationLabel && (
								<div className="text-muted-foreground flex items-center gap-1.5 text-sm">
									<MapPin className="size-4 shrink-0" />
									{locationLabel}
								</div>
							)}
							{experience !== null && experience !== undefined && (
								<div className="text-muted-foreground flex items-center gap-1.5 text-sm">
									<Calendar className="size-4 shrink-0" />
									{experience === 1 ? "1 year" : `${experience} years`} experience
								</div>
							)}
							{educationLevel && (
								<div className="text-muted-foreground flex items-center gap-1.5 text-sm">
									<BookOpen className="size-4 shrink-0" />
									{educationLevelLabel[educationLevel] ?? educationLevel}
								</div>
							)}
							{salaryDisplay && (
								<div className="text-muted-foreground flex items-center gap-1.5 text-sm">
									<Wallet className="size-4 shrink-0" />
									{salaryDisplay}
								</div>
							)}
						</div>
					</div>
				</div>
				{/* worker biography section */}
				{bio && (
					<div className="flex flex-col gap-2">
						<p className="text-foreground text-sm font-semibold">About</p>
						<p className="text-muted-foreground text-sm leading-relaxed">{bio}</p>
					</div>
				)}
				{/* listed skill set */}
				{jobLabels.length > 0 && (
					<div className="flex flex-col gap-3">
						<p className="text-foreground text-sm font-semibold">What I can help with</p>
						<div className="flex flex-wrap gap-2">
							{jobLabels.map(({ label, icon }) => (
								<span
									key={label}
									className="border-border text-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
								>
									{icon && <span>{icon}</span>}
									{label}
								</span>
							))}
						</div>
					</div>
				)}
				{/* spoken languages */}
				{languages.length > 0 && (
					<div className="flex flex-col gap-3">
						<p className="text-foreground text-sm font-semibold">Languages</p>
						<div className="flex flex-wrap gap-2">
							{languages.map((lang) => (
								<span
									key={lang}
									className="border-border text-muted-foreground inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm"
								>
									<Globe className="size-3.5" />
									{lang}
								</span>
							))}
						</div>
					</div>
				)}
				{/* stubbed call-to-action for expressing interest */}
				<div className="border-border border-t pt-6">
					<div className="flex flex-col gap-2">
						<p className="text-foreground text-sm font-semibold">
							Interested in {firstName}?
						</p>
						{hasExistingEoi ? (
							<p className="text-muted-foreground text-sm">
								You have already sent an expression of interest to {firstName}, who has
								been notified about your interest.
							</p>
						) : (
							<>
								<p className="text-muted-foreground text-sm">
									Send an expression of interest and {firstName} will be notified by email
									to expect your call.
								</p>
								<EoiButton wajakaziProfileId={profileId} wajakaziFirstName={firstName} />
							</>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};

export { WorkerProfile };
