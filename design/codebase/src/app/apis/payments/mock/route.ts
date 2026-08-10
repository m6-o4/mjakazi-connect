import { resolveIdentity } from "@/services/identity.service";
import { markPaymentCompleted } from "@/services/verification.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// provides a temporary endpoint for simulating successful payment confirmation in development
const POST = async () => {
	// development-only payment bypass
	if (process.env.ENABLE_PAYMENT_BYPASS !== "true") {
		return NextResponse.json({ error: "Not available." }, { status: 404 });
	}

	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });

	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found." }, { status: 404 });
	}

	// ensures that only users with a worker role can initiate the payment simulation
	if (identity.role !== "mjakazi") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	if (!identity.wajakaziProfileId) {
		return NextResponse.json({ error: "Profile not found." }, { status: 404 });
	}

	try {
		// bypasses real payment gateways to directly update the profile's verification state
		await markPaymentCompleted(payload, identity.wajakaziProfileId);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}

	return NextResponse.json({
		success: true,
		mock: true,
	});
};

export { POST };
