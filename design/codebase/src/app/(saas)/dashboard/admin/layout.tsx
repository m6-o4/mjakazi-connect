import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import config from "@payload-config";
import { getPayload } from "payload";
import { ReactNode } from "react";

const AdminDashboardLayout = async ({ children }: { children: ReactNode }) => {
	const payload = await getPayload({ config });

	// count profiles awaiting admin review for the sidebar badge
	const pendingCount = await payload.count({
		collection: "wajakaziprofiles",
		where: { verificationStatus: { equals: "pending_review" } },
		overrideAccess: true,
	});

	return (
		// establish the context for sidebar state and interactions
		<SidebarProvider>
			{/* provide navigation tailored to the admin role */}
			<DashboardSidebar role="admin" pendingVerificationCount={pendingCount.totalDocs} />
			{/* wrap the primary dashboard view to allow for responsive sidebar offsets */}
			<SidebarInset>{children}</SidebarInset>
		</SidebarProvider>
	);
};

export { AdminDashboardLayout as default };
