import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import { parseStkCallback } from "@/lib/mpesa";
import config from "@/payload-config";
import { handleCallback } from "@/services/payment.service";

// daraja posts the stk push result here once the handset responds. there is no
// signature on an stk callback, so authenticity rests on the correlation checks
// inside handleCallback (merchant request id + amount + phone + uniqueness).
// daraja retries anything that is not a 200, so every path returns 200 — even
// malformed or unverifiable callbacks — to avoid re-drilling a settled payment.
const POST = async (req: NextRequest) => {
	try {
		const callback = parseStkCallback(await req.json());
		if (!callback) {
			console.error("[api/webhooks/payments/callback] unrecognized callback body");
			return NextResponse.json(
				{ ResultCode: 0, ResultDesc: "Accepted" },
				{ status: 200 },
			);
		}

		const payload = await getPayload({ config });
		const result = await handleCallback(payload, callback);

		if (!result.success) {
			console.error("[api/webhooks/payments/callback] handling failed:", result.error);
		}

		return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
	} catch (error) {
		console.error("[api/webhooks/payments/callback]", error);
		return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
	}
};

export { POST };
