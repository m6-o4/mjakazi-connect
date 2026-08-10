import { ProfileCompletenessCard } from "@/components/dashboard/mjakazi/profile-completeness-card";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { VerificationProgressCard } from "@/components/dashboard/verification-progress-card";
import { VerificationStatusCard } from "@/components/dashboard/verification-status-card";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Dashboard" };

const INCOMPLETE_STATUSES = [
	"draft",
	"pending_payment",
	"pending_review",
	"rejected",
	"verification_expired",
];

const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// authorize worker role
	if (!identity || identity.role !== "mjakazi") redirect("/sign-in");

	// define incomplete verification status threshold
	const verificationStatus = identity.verificationStatus ?? "draft";
	const showVerificationCta = INCOMPLETE_STATUSES.includes(verificationStatus);

	// fetch full profile for completeness check
	const profileQuery = await payload.find({
		collection: "wajakaziprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		depth: 1,
		limit: 1,
	});

	const profile = profileQuery.docs[0] ?? null;
	const profileComplete = profile?.profileComplete ?? false;

	// count pending expressions of interest
	const eoiCountQuery = await payload.find({
		collection: "expressions-of-interest",
		where: {
			and: [
				{ wajakaziProfile: { equals: profile?.id } },
				{ status: { equals: "pending" } },
			],
		},
		overrideAccess: true,
		limit: 0,
	});

	const pendingEoiCount = eoiCountQuery.totalDocs;

	// build completeness checklist
	const completenessItems = [
		{
			label: "Upload profile photo",
			complete: !!profile?.photo,
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Add display name",
			complete: !!profile?.displayName && profile.displayName !== "New Worker",
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Add legal name",
			complete: !!profile?.legalFirstName && !!profile?.legalLastName,
			href: "/dashboard/mjakazi/verification",
		},
		{
			label: "Write your bio",
			complete: !!profile?.bio?.trim(),
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Select at least one job skill",
			complete: Array.isArray(profile?.jobs) && profile.jobs.length > 0,
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Set your location",
			complete: !!profile?.location,
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Set work preference",
			complete: !!profile?.workPreference,
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Add years of experience",
			complete: profile?.experience !== null && profile?.experience !== undefined,
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Select nationality",
			complete: !!profile?.nationality,
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Select at least one language",
			complete: Array.isArray(profile?.languages) && profile.languages.length > 0,
			href: "/dashboard/mjakazi/profile",
		},
		{
			label: "Add mobile phone number",
			complete: !!profile?.phoneNumber?.trim(),
			href: "/dashboard/mjakazi/profile",
		},
	];

	return (
		<>
			<DashboardTopbar title="My Dashboard" notificationCount={pendingEoiCount} />
			<main className="flex flex-1 flex-col gap-6 p-6">
				{/* render status overview grid */}
				<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
					<VerificationStatusCard verificationState={verificationStatus} />
					<VerificationProgressCard status={verificationStatus} />
					<Link
						href="/dashboard/mjakazi/opportunities"
						className="bg-card border-border hover:border-primary/40 flex flex-col gap-4 rounded-xl border p-6 transition-colors"
					>
						<p className="text-muted-foreground text-sm font-semibold">Opportunities</p>
						<p className="font-display text-foreground mt-2 text-2xl font-bold">
							{pendingEoiCount}
						</p>
						<p className="text-muted-foreground mt-1 text-sm">
							{pendingEoiCount === 1
								? "Employer is waiting for your response."
								: pendingEoiCount === 0
									? "No pending expressions of interest."
									: "Employers are waiting for your response."}
						</p>
					</Link>
				</div>

				{/* render onboarding and completeness alerts */}
				{(showVerificationCta || !profileComplete) && (
					<div className="grid items-start gap-6 md:grid-cols-2 xl:grid-cols-3">
						{/* render verification call to action */}
						{showVerificationCta && (
							<div className="bg-card border-border flex flex-col gap-4 self-start rounded-xl border p-6">
								<div>
									<p className="text-muted-foreground text-sm font-semibold">
										Complete Your Verification
									</p>
									<p className="text-muted-foreground mt-1 text-sm">
										Upload your documents and submit for admin review to get your verified
										badge and appear in the directory.
									</p>
								</div>
								<Link
									href="/dashboard/mjakazi/verification"
									className="bg-primary text-primary-foreground hover:bg-brand-primary-light inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
								>
									Go to Verification
									<ArrowRight className="size-4" />
								</Link>
							</div>
						)}

						{/* render profile completeness checklist */}
						{!profileComplete && (
							<ProfileCompletenessCard
								items={completenessItems}
								profileComplete={profileComplete}
							/>
						)}
					</div>
				)}
			</main>
		</>
	);
};

export { Page as default };
