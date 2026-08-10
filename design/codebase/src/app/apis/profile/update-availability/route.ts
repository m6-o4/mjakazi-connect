import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

const VALID_STATUSES = ["available", "hired", "on_break"] as const;
type AvailabilityStatus = (typeof VALID_STATUSES)[number];

const PATCH = async (req: Request) => {
	const { userId } = await auth();

// authenticate request
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// authorize worker role and profile existence
	if (!identity || identity.role !== "mjakazi") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	if (!identity.wajakaziProfileId) {
		return NextResponse.json({ error: "Profile not found." }, { status: 404 });
	}

	const { availabilityStatus } = await req.json();

	// validate requested status
	if (!VALID_STATUSES.includes(availabilityStatus)) {
		return NextResponse.json({ error: "Invalid availability status." }, { status: 400 });
	}

	// restrict to verified profiles
	if (identity.verificationStatus !== "verified") {
		return NextResponse.json(
			{ error: "Only verified profiles can update availability status." },
			{ status: 403 },
		);
	}

	// persist updated status
	await payload.update({
		collection: "wajakaziprofiles",
		id: identity.wajakaziProfileId,
		overrideAccess: true,
		data: { availabilityStatus },
	});

	return NextResponse.json({ success: true, availabilityStatus });
};

export { PATCH };
