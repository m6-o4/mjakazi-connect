import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { ReviewQueue } from "@/components/dashboard/staff/reviews/review-queue";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listPendingReviews } from "@/services/review.service";

export const metadata: Metadata = { title: "Reviews" };

const StaffReviewsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const result = await listPendingReviews(payload, user);
	const items = result.success ? result.data : [];

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Review moderation</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Reviews awaiting moderation, oldest first.
				</p>
			</div>

			<ReviewQueue items={items} />
		</div>
	);
};

export { StaffReviewsPage as default };
