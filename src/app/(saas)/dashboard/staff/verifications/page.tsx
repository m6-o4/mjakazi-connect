import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import {
	VerificationQueue,
	type QueueItem,
} from "@/components/dashboard/staff/verifications/verification-queue";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listPendingReviews } from "@/services/verification.service";

export const metadata: Metadata = { title: "Verifications" };

const StaffVerificationsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const result = await listPendingReviews(payload, user);

	const items: QueueItem[] = result.success
		? result.data.map((profile) => ({
				id: profile.id,
				displayName: profile.displayName,
				legalName: [profile.legalFirstName, profile.legalLastName]
					.filter(Boolean)
					.join(" ")
					.trim(),
				submittedAt: profile.verificationSubmittedAt,
				attempts: profile.verificationAttempts,
			}))
		: [];

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Verification review</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Profiles awaiting document review, oldest first.
				</p>
			</div>

			<VerificationQueue items={items} />
		</div>
	);
};

export { StaffVerificationsPage as default };
