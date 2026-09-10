import { notFound, redirect } from "next/navigation";
import { getPayload } from "payload";

import config from "@/payload-config";
import { getCurrentUser } from "@/components/admin/get-current-user";
import { ConciergeCaseDetail } from "@/components/dashboard/staff/concierge/concierge-case-detail";
import { DIRECTORY_VISIBLE } from "@/payload/access/access-control";
import type { ConciergeCase } from "@/payload-types";

export const dynamic = "force-dynamic";

type Props = {
	params: Promise<{ id: string }>;
};

const Page = async ({ params }: Props) => {
	const { id } = await params;
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") redirect(`/dashboard/${user.role}`);

	const payload = await getPayload({ config });

	let conciergeCase: ConciergeCase | null = null;
	try {
		conciergeCase = await payload.findByID({
			collection: "concierge-cases",
			id,
			depth: 2,
			overrideAccess: true,
		});
	} catch {
		notFound();
	}

	if (!conciergeCase) notFound();

	// load available verified wajakazi profiles for shortlist building
	const candidatesResult = await payload.find({
		collection: "wajakazi-profiles",
		where: DIRECTORY_VISIBLE,
		limit: 100,
		depth: 0,
		overrideAccess: true,
	});

	const availableCandidates = candidatesResult.docs.map((doc) => ({
		id: doc.id,
		displayName: doc.displayName,
		jobsSkills: doc.jobsSkills ?? [],
		location: doc.location ?? null,
		yearsExperience: doc.yearsExperience ?? 0,
		salaryMin: doc.salaryMin ?? null,
		salaryMax: doc.salaryMax ?? null,
	}));

	return (
		<div className="space-y-6 max-w-4xl">
			<ConciergeCaseDetail
				conciergeCase={conciergeCase}
				availableCandidates={availableCandidates}
				currentUserId={user.id}
			/>
		</div>
	);
};

export { Page as default };
