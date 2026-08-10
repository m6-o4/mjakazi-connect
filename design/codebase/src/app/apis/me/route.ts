import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

export async function GET() {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found." }, { status: 404 });
	}

	const response: Record<string, unknown> = { role: identity.role };

	// verification status drives mjakazi dashboard gating
	if (identity.verificationStatus) {
		response.verificationStatus = identity.verificationStatus;
	}

	// subscriptionStatus drives mwajiri dashboard gating and payment card polling
	// the payment card polls this endpoint and checks for "active" to confirm payment
	if (identity.subscriptionStatus) {
		response.subscriptionStatus = identity.subscriptionStatus;
	}

	return NextResponse.json(response);
}
