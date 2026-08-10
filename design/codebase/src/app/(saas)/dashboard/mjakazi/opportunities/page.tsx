import { AvailabilityToggle } from "@/components/dashboard/mjakazi/availability-toggle";
import { EoiInbox } from "@/components/dashboard/mjakazi/eoi-inbox";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

export const metadata: Metadata = { title: "Opportunities" };
export const dynamic = "force-dynamic";

const Page = async () => {
	const { userId } = await auth();

	if (!userId) redirect("/sign-in");

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// authorize worker role
	if (!identity || identity.role !== "mjakazi") redirect("/sign-in");

	// fetch profile data
	const profileQuery = await payload.find({
		collection: "wajakaziprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const profile = profileQuery.docs[0] ?? null;
	const availabilityStatus =
		(profile?.availabilityStatus as "available" | "hired" | "on_break") ?? "available";
	const isVerified = identity.verificationStatus === "verified";

	// fetch incoming expressions of interest
	const eoiQuery = await payload.find({
		collection: "expressions-of-interest",
		where: { wajakaziProfile: { equals: profile?.id } },
		overrideAccess: true,
		sort: "-createdAt",
		limit: 50,
	});

	const eois = eoiQuery.docs.map((eoi) => ({
		id: eoi.id,
		mwajiriDisplayName: eoi.mwajiriDisplayName ?? "Unknown",
		mwajiriOrganization: eoi.mwajiriOrganization ?? null,
		mwajiriEmail: eoi.mwajiriEmail ?? "",
		status: eoi.status as "pending" | "interested" | "not_interested",
		createdAt: eoi.createdAt,
	}));

	return (
		<>
			<DashboardTopbar title="Opportunities" />
			<main className="flex flex-1 flex-col gap-6 p-6">
				{/* render availability management for verified profiles */}
				{isVerified && <AvailabilityToggle currentStatus={availabilityStatus} />}

				{/* display message for unverified profiles */}
				{!isVerified && (
					<div className="bg-muted/40 border-border rounded-xl border p-6">
						<p className="text-muted-foreground text-sm">
							Your availability status will be manageable once your profile is verified.
						</p>
					</div>
				)}

				{/* render expressions of interest inbox */}
				<EoiInbox eois={eois} />
			</main>
		</>
	);
};

export { Page as default };
