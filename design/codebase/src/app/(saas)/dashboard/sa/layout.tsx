import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import config from "@payload-config";
import { getPayload } from "payload";
import { ReactNode } from "react";

const SaDashboardLayout = async ({ children }: { children: ReactNode }) => {
	const payload = await getPayload({ config });

	// count profiles awaiting review so the sidebar can surface a live badge
	// without requiring the verifications page itself to be loaded first
	const pendingCount = await payload.count({
		collection: "wajakaziprofiles",
		where: { verificationStatus: { equals: "pending_review" } },
		overrideAccess: true,
	});

	return (
		<SidebarProvider>
			<DashboardSidebar role="sa" pendingVerificationCount={pendingCount.totalDocs} />
			<SidebarInset>{children}</SidebarInset>
		</SidebarProvider>
	);
};

export { SaDashboardLayout as default };
