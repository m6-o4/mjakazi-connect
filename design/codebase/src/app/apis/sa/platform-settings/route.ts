import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// PATCH /apis/sa/platform-settings — updates platform-wide config; restricted to the sa role
export const PATCH = async (req: Request) => {
	try {
		// reject unauthenticated requests before touching any data
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
		}

		const payload = await getPayload({ config });
		const identity = await resolveIdentity(payload, userId);

		// only the sa role may change platform-level settings
		if (!identity || identity.role !== "sa") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		const body = await req.json();
		const { registrationFee } = body;

		// presence check — the field has no meaningful default so it must be supplied explicitly
		if (registrationFee === undefined || registrationFee === null) {
			return NextResponse.json({ error: "registrationFee is required" }, { status: 400 });
		}

		// guard against strings, NaN, and Infinity slipping through JSON
		if (typeof registrationFee !== "number" || !Number.isFinite(registrationFee)) {
			return NextResponse.json(
				{ error: "registrationFee must be a number" },
				{ status: 400 },
			);
		}

		// enforce a minimum that keeps the fee economically meaningful
		if (registrationFee < 1) {
			return NextResponse.json(
				{ error: "registrationFee must be at least KSh 1" },
				{ status: 400 },
			);
		}

		// persist via the Payload local API — bypasses HTTP overhead and runs within the same process
		await payload.updateGlobal({ slug: "platform-settings", data: { registrationFee } });

		return NextResponse.json({ success: true, registrationFee }, { status: 200 });
	} catch (error) {
		console.error("[sa/platform-settings] error:", error);
		return NextResponse.json(
			{ error: "Failed to update platform settings" },
			{ status: 500 },
		);
	}
};
