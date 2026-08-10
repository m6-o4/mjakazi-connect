import { NameUpdateForm } from "@/components/dashboard/settings/name-update-form";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth, currentUser } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Settings" };

const Page = async () => {
	const { userId } = await auth();
	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity || identity.role !== "admin") redirect("/sign-in");

	// read current name from clerk directly
	const clerkUser = await currentUser();

	return (
		<>
			<DashboardTopbar title="Settings" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				<div className="grid gap-6 md:grid-cols-2">
					<NameUpdateForm
						currentFirstName={clerkUser?.firstName ?? ""}
						currentLastName={clerkUser?.lastName ?? ""}
					/>
				</div>
			</main>
		</>
	);
};

export { Page as default };
