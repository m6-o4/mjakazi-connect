// direct safaricom daraja stk push client. server-only — never imported into a
// client component. the callback is the only source of truth for payment; this
// module only initiates a push and reports whether daraja accepted the request.

import { addSeconds } from "date-fns";
import { z } from "zod";

import { normalizeKenyanPhone } from "@/lib/phone";

const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT;
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL;

// sandbox and production are entirely different hosts — resolved at call time,
// never hardcoded into the request paths
const SANDBOX_BASE_URL = "https://sandbox.safaricom.co.ke";
const PRODUCTION_BASE_URL = "https://api.safaricom.co.ke";

// paybill shortcodes use a passkey and this transaction type for stk push. the
// project's env shape (shortcode + passkey) is the standard paybill setup
const TRANSACTION_TYPE = "CustomerPayBillOnline";

const getBaseUrl = (): string => {
	if (MPESA_ENVIRONMENT === "production") return PRODUCTION_BASE_URL;
	return SANDBOX_BASE_URL;
};

// daraja timestamps are compared against safaricom's own clock in east africa
// time, so format in nairobi rather than the host's local time. the value is
// yyyymmddhhmmss
const formatDarajaTimestamp = (date: Date): string => {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: "Africa/Nairobi",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hourCycle: "h23",
	}).formatToParts(date);

	const value = (type: Intl.DateTimeFormatPartTypes): string =>
		parts.find((part) => part.type === type)?.value ?? "";

	return `${value("year")}${value("month")}${value("day")}${value("hour")}${value("minute")}${value("second")}`;
};

// the stk push password is the base64 of shortcode + passkey + timestamp, where
// the timestamp must be identical to the one sent in the request body
const generatePassword = (
	shortcode: string,
	passkey: string,
	timestamp: string,
): string => Buffer.from(`${shortcode}${passkey}${timestamp}`).toString("base64");

type OAuthResponse = {
	access_token?: string;
	expires_in?: string;
};

// daraja access tokens last about an hour; cache in memory and refresh a minute
// early so a request never uses a token on the edge of expiry
let cachedToken: { accessToken: string; expiresAt: number } | null = null;

const getAccessToken = async (): Promise<string | null> => {
	if (cachedToken && cachedToken.expiresAt > addSeconds(Date.now(), 60).getTime()) {
		return cachedToken.accessToken;
	}

	const credentials = Buffer.from(
		`${MPESA_CONSUMER_KEY ?? ""}:${MPESA_CONSUMER_SECRET ?? ""}`,
	).toString("base64");

	const response = await fetch(
		`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`,
		{
			method: "GET",
			headers: { Authorization: `Basic ${credentials}` },
		},
	);

	if (!response.ok) return null;

	const data = (await response.json()) as OAuthResponse;
	if (!data.access_token) return null;

	cachedToken = {
		accessToken: data.access_token,
		expiresAt: addSeconds(Date.now(), Number(data.expires_in ?? "3600")).getTime(),
	};

	return cachedToken.accessToken;
};

type StkPushResponse = {
	MerchantRequestID?: string;
	CheckoutRequestID?: string;
	ResponseCode?: string;
	ResponseDescription?: string;
	CustomerMessage?: string;
	// a push rejected before it reaches the handset answers with this shape instead
	// of a ResponseCode — see the "Sample error response" in the express docs
	errorCode?: string;
	errorMessage?: string;
};

type StkPushSuccess = {
	success: true;
	merchantRequestId: string;
	checkoutRequestId: string;
	raw: StkPushResponse;
};

type StkPushFailure = {
	success: false;
	error: string;
	raw?: StkPushResponse;
};

type StkPushResult = StkPushSuccess | StkPushFailure;

// sends an stk push to a handset. the phone number is normalized here at the
// boundary — the one place phone normalization happens for the money path. a
// returned success only means daraja accepted the request for processing; it does
// not mean anyone paid. only the callback confirms payment.
const initiateStkPush = async ({
	phoneNumber,
	amount,
	accountReference,
	description,
}: {
	phoneNumber: string;
	amount: number;
	accountReference: string;
	description: string;
}): Promise<StkPushResult> => {
	const normalized = normalizeKenyanPhone(phoneNumber);
	if (!normalized) {
		return { success: false, error: "Invalid Kenyan phone number." };
	}

	const token = await getAccessToken();
	if (!token) {
		return { success: false, error: "Could not authenticate with M-Pesa." };
	}

	const timestamp = formatDarajaTimestamp(new Date());
	const password = generatePassword(
		MPESA_SHORTCODE ?? "",
		MPESA_PASSKEY ?? "",
		timestamp,
	);

	const body = {
		BusinessShortCode: MPESA_SHORTCODE,
		Password: password,
		Timestamp: timestamp,
		TransactionType: TRANSACTION_TYPE,
		Amount: String(amount),
		PartyA: normalized,
		PartyB: MPESA_SHORTCODE,
		PhoneNumber: normalized,
		CallBackURL: MPESA_CALLBACK_URL,
		AccountReference: accountReference,
		TransactionDesc: description,
	};

	const response = await fetch(`${getBaseUrl()}/mpesa/stkpush/v1/processrequest`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(body),
	});

	const raw = (await response.json()) as StkPushResponse;

	// daraja returns http 200 even for a rejected push — the response code inside
	// the body is the signal, not the http status. a rejection carries
	// `errorCode`/`errorMessage` instead of `ResponseCode`, and those are the only
	// fields that say what actually went wrong, so they are preferred over the
	// generic fallback
	if (!response.ok || raw.ResponseCode !== "0" || !raw.CheckoutRequestID) {
		return {
			success: false,
			error:
				raw.errorMessage ??
				raw.ResponseDescription ??
				raw.CustomerMessage ??
				"M-Pesa rejected the request.",
			raw,
		};
	}

	return {
		success: true,
		merchantRequestId: raw.MerchantRequestID ?? "",
		checkoutRequestId: raw.CheckoutRequestID ?? "",
		raw,
	};
};

// --- status query -----------------------------------------------------------

// the query response, exactly as safaricom documents it: six fields and nothing
// else. there is deliberately no receipt here — the query asks about the request
// we sent to the handset, not about the money that moved, so a `ResultCode` of 0
// says the customer paid but can never produce the `MpesaReceiptNumber`. that
// exists only in the callback, or in the customer's own sms
type StkQueryResponse = {
	ResponseCode?: string;
	ResponseDescription?: string;
	MerchantRequestID?: string;
	CheckoutRequestID?: string;
	ResultCode?: string | number;
	ResultDesc?: string;
	// a push still being processed, or one daraja does not recognise, answers with
	// this shape rather than a result code
	errorCode?: string;
	errorMessage?: string;
};

type StkQueryResult =
	| { success: true; paid: boolean; resultCode: number; resultDesc: string | null }
	| { success: false; error: string };

// asks daraja what happened to a push we already sent. used only when no callback
// arrived — it is the substitute for the missing delivery, not a second opinion on
// one we received. a failure here is inconclusive, never a "not paid" verdict
const queryStkStatus = async (checkoutRequestId: string): Promise<StkQueryResult> => {
	const token = await getAccessToken();
	if (!token) {
		return { success: false, error: "Could not authenticate with M-Pesa." };
	}

	const timestamp = formatDarajaTimestamp(new Date());
	const password = generatePassword(
		MPESA_SHORTCODE ?? "",
		MPESA_PASSKEY ?? "",
		timestamp,
	);

	const response = await fetch(`${getBaseUrl()}/mpesa/stkpushquery/v1/query`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			BusinessShortCode: MPESA_SHORTCODE,
			Password: password,
			Timestamp: timestamp,
			CheckoutRequestID: checkoutRequestId,
		}),
	});

	const raw = (await response.json()) as StkQueryResponse;

	if (!response.ok) {
		return { success: false, error: "M-Pesa could not be reached for a status check." };
	}

	if (raw.errorCode) {
		return {
			success: false,
			error: raw.errorMessage ?? "M-Pesa could not report on this transaction.",
		};
	}

	if (raw.ResponseCode && raw.ResponseCode !== "0") {
		return {
			success: false,
			error: raw.ResponseDescription ?? "M-Pesa rejected the status check.",
		};
	}

	const resultCode = Number(raw.ResultCode);
	if (!Number.isInteger(resultCode)) {
		return {
			success: false,
			error: raw.ResultDesc ?? "M-Pesa returned no result for this transaction.",
		};
	}

	return {
		success: true,
		paid: resultCode === 0,
		resultCode,
		resultDesc: raw.ResultDesc ?? null,
	};
};

// --- callback parsing -------------------------------------------------------

// daraja 3.0 sends some metadata items without a `Value` at all — a paybill STK
// callback includes `{ Name: "Balance" }` with no value when no balance is
// returned. requiring `Value` rejected the whole callback, which is only
// tolerated/coerced elsewhere, so it must stay optional here
const callbackMetadataItemSchema = z.object({
	Name: z.string(),
	Value: z.union([z.string(), z.number()]).nullish(),
});

// the shape daraja posts back once the handset responds. result code 0 means the
// user paid; any other code is a cancellation or failure, in which case
// CallbackMetadata is absent. parsing is deliberately tolerant — daraja is
// inconsistent about whether it sends numeric fields as numbers or strings, and
// drops `ResultDesc`/`CallbackMetadata` on failure callbacks — so a callback is
// coerced rather than rejected outright
const stkCallbackSchema = z.object({
	Body: z.object({
		stkCallback: z.object({
			MerchantRequestID: z.coerce.string(),
			CheckoutRequestID: z.coerce.string(),
			ResultCode: z.coerce.number().int(),
			ResultDesc: z.string().nullish(),
			CallbackMetadata: z
				.object({
					Item: z.array(callbackMetadataItemSchema),
				})
				.nullish(),
		}),
	}),
});

type StkCallback = z.infer<typeof stkCallbackSchema>;

// validates and narrows an unknown request body into the daraja callback shape.
// returns null for anything that is not a recognizable stk callback so the
// caller can drop it with a 200 rather than fail loudly and invite retries
const parseStkCallback = (raw: unknown): StkCallback | null => {
	const result = stkCallbackSchema.safeParse(raw);
	return result.success ? result.data : null;
};

// reads a named value out of the callback's metadata items
const getCallbackMetadataValue = (
	callback: StkCallback,
	name: string,
): string | number | undefined => {
	const items = callback.Body.stkCallback.CallbackMetadata?.Item ?? [];
	const val = items.find((item) => item.Name === name)?.Value;
	return val ?? undefined;
};

export { getCallbackMetadataValue, initiateStkPush, parseStkCallback, queryStkStatus };
export type { StkCallback, StkPushResult, StkQueryResult };
