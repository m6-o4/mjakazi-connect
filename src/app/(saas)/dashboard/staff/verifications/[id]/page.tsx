import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import {
	DocumentViewer,
	type ReviewDocument,
} from "@/components/dashboard/staff/verifications/document-viewer";
import { ReviewForm } from "@/components/dashboard/staff/verifications/review-form";
import { buttonVariants } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { COUNTRY_OPTIONS } from "@/lib/profile-constants";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";

type Args = {
	params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "Review" };

const formatDate = (value: string): string =>
	new Intl.DateTimeFormat("en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
		timeZone: "Africa/Nairobi",
	}).format(new Date(value));

const nationalityLabel = (value: string | null | undefined): string =>
	COUNTRY_OPTIONS.find((option) => option.value === value)?.label ?? value ?? "Not set";

const StaffVerificationReviewPage = async ({ params }: Args) => {
	const { id } = await params;

	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });

	let profile;
	try {
		profile = await payload.findByID({
			collection: "wajakazi-profiles",
			id,
			depth: 0,
			select: {
				displayName: true,
				legalFirstName: true,
				legalLastName: true,
				dateOfBirth: true,
				nationality: true,
				phone: true,
				verificationState: true,
				verificationSubmittedAt: true,
				verificationAttempts: true,
			},
			overrideAccess: false,
			req: { user },
		});
	} catch {
		notFound();
	}

	const docsResult = await payload.find({
		collection: "vault-documents",
		where: { profile: { equals: profile.id } },
		limit: 10,
		select: { documentType: true, filename: true },
		overrideAccess: false,
		req: { user },
	});
	const documents: ReviewDocument[] = docsResult.docs.map((doc) => ({
		id: doc.id,
		documentType: doc.documentType,
		filename: doc.filename ?? null,
	}));

	const legalName = [profile.legalFirstName, profile.legalLastName]
		.filter(Boolean)
		.join(" ")
		.trim();

	const identityRows = [
		{ label: "Legal name", value: legalName || "Not set" },
		{
			label: "Date of birth",
			value: profile.dateOfBirth ? formatDate(profile.dateOfBirth) : "Not set",
		},
		{ label: "Nationality", value: nationalityLabel(profile.nationality) },
		{ label: "Phone", value: profile.phone ?? "Not set" },
	];

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">{profile.displayName}</h1>
				<p className="text-muted-foreground mt-1 text-sm">Verification review</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Profile</CardTitle>
				</CardHeader>
				<CardContent className="grid gap-4 sm:grid-cols-2">
					{identityRows.map((row) => (
						<div key={row.label}>
							<p className="text-muted-foreground text-xs">{row.label}</p>
							<p className="text-foreground text-sm font-medium">{row.value}</p>
						</div>
					))}
				</CardContent>
			</Card>

			<DocumentViewer documents={documents} />

			{profile.verificationState === "pending_review" ? (
				<ReviewForm
					profileId={profile.id}
					verificationSubmittedAt={profile.verificationSubmittedAt ?? null}
					verificationAttempts={profile.verificationAttempts ?? null}
				/>
			) : (
				<Card>
					<CardHeader>
						<CardTitle>Already resolved</CardTitle>
						<CardDescription>
							This profile is no longer awaiting review — its current state is{" "}
							{profile.verificationState.replace(/_/g, " ")}.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Link
							href="/dashboard/staff/verifications"
							className={buttonVariants({ variant: "outline" })}
						>
							Back to queue
						</Link>
					</CardContent>
				</Card>
			)}
		</div>
	);
};

export { StaffVerificationReviewPage as default };
