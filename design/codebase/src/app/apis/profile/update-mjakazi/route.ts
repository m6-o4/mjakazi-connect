import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// statuses where legal name editing is no longer permitted
const LOCKED_STATUSES = ["pending_review", "verified", "blacklisted", "deactivated"];

const PATCH = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found." }, { status: 404 });
	}

	if (identity.role !== "mjakazi") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	if (!identity.wajakaziProfileId) {
		return NextResponse.json({ error: "Profile not found." }, { status: 404 });
	}

	// enforce lock at api level regardless of ui state
	if (
		identity.verificationStatus &&
		LOCKED_STATUSES.includes(identity.verificationStatus)
	) {
		return NextResponse.json(
			{ error: "Profile cannot be edited in its current verification state." },
			{ status: 400 },
		);
	}

	const body = await req.json();
	const { legalFirstName, legalLastName, photoId } = body;

	if (!legalFirstName || !legalLastName) {
		return NextResponse.json(
			{ error: "Legal first name and last name are required." },
			{ status: 400 },
		);
	}

	try {
		await payload.update({
			collection: "wajakaziprofiles",
			id: identity.wajakaziProfileId,
			overrideAccess: true,
			data: {
				legalFirstName: legalFirstName.trim(),
				legalLastName: legalLastName.trim(),
				// only update photo if a new one was provided
				...(photoId ? { photo: photoId } : {}),
			},
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
};

export { PATCH };
