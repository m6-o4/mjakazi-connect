import { sendVerificationRejectedEmail } from "@/lib/email";
import { resolveIdentity } from "@/services/identity.service";
import { rejectVerification } from "@/services/verification.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// processes verification rejection; verifies admin/sa session and updates profile status
const POST = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found" }, { status: 404 });
	}

	if (identity.role !== "admin" && identity.role !== "sa") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const body = await req.json();
	const { profileId, reason } = body;

	if (!profileId || !reason) {
		return NextResponse.json({ error: "profileId and reason required" }, { status: 400 });
	}

	const actorQuery = await payload.find({
		collection: "accounts",
		where: { clerkId: { equals: userId } },
		overrideAccess: true,
		limit: 1,
	});

	const actor = actorQuery.docs[0] ?? null;
	const actorLabel = actor
		? [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim() || actor.email
		: userId;

	try {
		await rejectVerification(payload, profileId, reason, identity.accountId, actorLabel);

		// resolve account to send notification
		const profileResult = await payload.find({
			collection: "wajakaziprofiles",
			where: { id: { equals: profileId } },
			overrideAccess: true,
			limit: 1,
		});

		const profile = profileResult.docs[0] ?? null;

		if (profile) {
			const accountId =
				typeof profile.account === "object"
					? (profile.account as any).id
					: profile.account;

			const accountResult = await payload.findByID({
				collection: "accounts",
				id: accountId,
				overrideAccess: true,
			});

			// calculate remaining attempts for feedback
			const attemptsRemaining = Math.max(0, 3 - (profile.verificationAttempts ?? 0));

			if (accountResult?.email) {
				try {
					await sendVerificationRejectedEmail({
						to: accountResult.email,
						firstName: accountResult.firstName ?? "there",
						rejectionReason: reason,
						attemptsRemaining,
					});
				} catch (emailError) {
					console.error(
						"[verification/reject] failed to send rejection email:",
						emailError,
					);
				}
			}
		}
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
};

export { POST };
