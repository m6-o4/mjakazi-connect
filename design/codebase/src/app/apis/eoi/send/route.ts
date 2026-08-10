import { sendEoiMjakaziEmail, sendEoiMwajiriEmail } from "@/lib/email";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";
import { writeAuditLog } from "@/lib/audit";

const POST = async (req: Request) => {
	const { userId } = await auth();

	// authenticate request
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// authorize employer role
	if (!identity || identity.role !== "mwajiri") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	// check active subscription
	const mwajiriProfileResult = await payload.find({
		collection: "waajiriprofiles",
		where: { account: { equals: identity.accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const mwajiriProfile = mwajiriProfileResult.docs[0] ?? null;

	if (mwajiriProfile?.subscriptionStatus !== "active") {
		return NextResponse.json(
			{ error: "An active subscription is required to send expressions of interest." },
			{ status: 403 },
		);
	}

	const { wajakaziProfileId } = await req.json();

	if (!wajakaziProfileId) {
		return NextResponse.json(
			{ error: "wajakaziProfileId is required." },
			{ status: 400 },
		);
	}

	// validate target profile criteria
	let wajakaziProfile: any = null;

	try {
		wajakaziProfile = await payload.findByID({
			collection: "wajakaziprofiles",
			id: wajakaziProfileId,
			overrideAccess: true,
			depth: 0,
		});
	} catch {
		return NextResponse.json({ error: "Worker profile not found." }, { status: 404 });
	}

	if (
		wajakaziProfile.verificationStatus !== "verified" ||
		!wajakaziProfile.profileComplete ||
		wajakaziProfile.availabilityStatus === "hired"
	) {
		return NextResponse.json(
			{ error: "This worker is not available for hire." },
			{ status: 400 },
		);
	}

	// prevent duplicate eoi
	const existing = await payload.find({
		collection: "expressions-of-interest",
		where: {
			and: [
				{ mwajiriAccount: { equals: identity.accountId } },
				{ wajakaziProfile: { equals: wajakaziProfileId } },
			],
		},
		overrideAccess: true,
		limit: 1,
	});

	if (existing.totalDocs > 0) {
		return NextResponse.json(
			{ error: "You have already sent an expression of interest to this worker." },
			{ status: 409 },
		);
	}

	// prepare employer notification data
	const mwajiriAccountResult = await payload.find({
		collection: "accounts",
		where: { clerkId: { equals: userId } },
		overrideAccess: true,
		limit: 1,
	});

	const mwajiriAccount = mwajiriAccountResult.docs[0] ?? null;
	const mwajiriEmail = mwajiriAccount?.email ?? "";
	const mwajiriDisplayName =
		(mwajiriProfile?.displayName ??
			[mwajiriAccount?.firstName, mwajiriAccount?.lastName].filter(Boolean).join(" ")) ||
		"A potential employer";
	const mwajiriOrganization = mwajiriProfile?.organization ?? null;

	// resolve worker account data
	const wajakaziAccountId =
		typeof wajakaziProfile.account === "string"
			? wajakaziProfile.account
			: (wajakaziProfile.account as any)?.id;

	const wajakaziAccountResult = await payload.findByID({
		collection: "accounts",
		id: wajakaziAccountId,
		overrideAccess: true,
	});

	const wajakaziEmail = (wajakaziAccountResult as any)?.email ?? null;
	const wajakaziFirstName = (wajakaziProfile.displayName ?? "").split(" ")[0] || "there";

	// create eoi record
	const eoi = await payload.create({
		collection: "expressions-of-interest",
		overrideAccess: true,
		data: {
			mwajiriAccount: identity.accountId,
			wajakaziProfile: wajakaziProfileId,
			mwajiriDisplayName,
			mwajiriOrganization,
			mwajiriEmail,
			status: "pending",
			notificationSent: false,
		},
	});

	try {
		await Promise.all([
			wajakaziEmail
				? sendEoiMjakaziEmail({
						to: wajakaziEmail,
						firstName: wajakaziFirstName,
						mwajiriDisplayName,
						mwajiriOrganization,
					})
				: Promise.resolve(),
			sendEoiMwajiriEmail({
				to: mwajiriEmail,
				wajakaziFirstName,
				wajakaziPhoneNumber: wajakaziProfile.phoneNumber ?? null,
				mwajiriDisplayName,
			}),
		]);

		await payload.update({
			collection: "expressions-of-interest",
			id: eoi.id,
			overrideAccess: true,
			data: { notificationSent: true },
		});
	} catch (emailError) {
		// notify parties via email; ignore failure
		console.error("[EOI] Failed to send notification emails:", emailError);
	}

	await writeAuditLog({
		action: "eoi_sent",
		actorId: identity.accountId,
		actorLabel: mwajiriDisplayName,
		targetId: wajakaziAccountId,
		targetLabel: wajakaziFirstName,
		metadata: {
			eoiId: eoi.id,
			wajakaziProfileId,
			mwajiriOrganization: mwajiriOrganization ?? null,
		},
		source: "user",
	});

	return NextResponse.json({ success: true });
};

export { POST };
