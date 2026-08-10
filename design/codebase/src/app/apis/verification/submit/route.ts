import { resolveIdentity } from "@/services/identity.service";
import { submitVerification } from "@/services/verification.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// handles the initial submission of a worker verification request
const POST = async () => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });

	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found." }, { status: 404 });
	}

	// ensures that only users with a worker role can submit for verification
	if (identity.role !== "mjakazi") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	if (!identity.wajakaziProfileId) {
		return NextResponse.json({ error: "Profile not found." }, { status: 404 });
	}

	// triggers the internal verification service to advance the profile lifecycle
	try {
		await submitVerification(payload, identity.wajakaziProfileId);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({ success: true });
};

export { POST };
