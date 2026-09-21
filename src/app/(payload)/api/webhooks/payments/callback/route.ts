import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import { parseStkCallback } from "@/lib/mpesa";
import config from "@/payload-config";
import { handleCallback, recordCallbackArrival } from "@/services/payment.service";

// daraja posts the stk push result here once the handset responds. there is no
// signature on an stk callback, so authenticity rests on the correlation checks
// inside handleCallback (merchant request id + amount + phone + uniqueness).
// daraja retries anything that is not a 200, so every path returns 200 — even
// malformed or unverifiable callbacks — to avoid re-drilling a settled payment.
//
// the body is read as text and parsed by hand rather than with req.json() so an
// unreadable body can be recorded verbatim: answering 200 means daraja never
// re-sends, so an arrival we cannot read is otherwise lost without evidence
const POST = async (req: NextRequest) => {
	try {
		const rawBody = await req.text();

		let body: unknown = null;
		try {
			body = JSON.parse(rawBody);
		} catch {
			body = null;
		}

		const callback = parseStkCallback(body);
		const payload = await getPayload({ config });

		// recorded before any decision about the payload, so the records show that
		// daraja posted even when we cannot match or read what it sent
		await recordCallbackArrival(payload, { raw: rawBody, callback });

		if (!callback) {
			console.error(
				"[api/webhooks/payments/callback] unrecognized callback body:",
				rawBody,
			);
			return NextResponse.json(
				{ ResultCode: 0, ResultDesc: "Accepted" },
				{ status: 200 },
			);
		}

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
