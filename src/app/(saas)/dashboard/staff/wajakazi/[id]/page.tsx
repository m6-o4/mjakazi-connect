import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { StaffCandidateProfile } from "@/components/dashboard/staff/wajakazi/staff-candidate-profile";
import { buttonVariants } from "@/components/ui/button";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { getShortlistCandidateProfile } from "@/services/concierge.service";

export const metadata: Metadata = { title: "Candidate" };
export const dynamic = "force-dynamic";

type Props = {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ caseId?: string | string[] }>;
};

const StaffCandidatePage = async ({ params, searchParams }: Props) => {
	const { id } = await params;
	const { caseId } = await searchParams;

	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const result = await getShortlistCandidateProfile(payload, user, id);
	if (!result.success) notFound();

	// the builder passes its case id so "back" returns to the case and the
	// session-stored shortlist draft is restored; direct visits fall back to the queue
	const caseIdParam = typeof caseId === "string" ? caseId : caseId?.[0];
	const backHref = caseIdParam
		? `/dashboard/staff/concierge/${caseIdParam}`
		: "/dashboard/staff/concierge";

	return (
		<div className="flex max-w-5xl flex-col gap-6">
			<Link
				href={backHref}
				className={buttonVariants({ variant: "outline", size: "sm", className: "w-fit" })}
			>
				<ArrowLeft className="size-4" />
				{caseIdParam ? "Back to Case" : "Back to Concierge"}
			</Link>

			<StaffCandidateProfile profile={result.data.profile} email={result.data.email} />
		</div>
	);
};

export { StaffCandidatePage as default };
