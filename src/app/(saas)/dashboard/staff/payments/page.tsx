import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { StuckPaymentList } from "@/components/dashboard/staff/payments/stuck-payment-list";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { listStuckPayments } from "@/services/payment.service";

export const metadata: Metadata = { title: "Payments" };

const StaffPaymentsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");
	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	const payload = await getPayload({ config });
	const items = await listStuckPayments(payload);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">Payments waiting on us</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					M-Pesa took the prompt but we never received the confirmation, so the customer
					is still waiting. Complete one only from the receipt in the customer&apos;s own
					M-Pesa SMS.
				</p>
			</div>

			<StuckPaymentList items={items} />
		</div>
	);
};

export { StaffPaymentsPage as default };
