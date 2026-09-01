// direct safaricom daraja stk push client. server-only — never imported into a
// client component. the callback is the only source of truth for payment; this
// module only initiates a push and reports whether daraja accepted the request.

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
	if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
		return cachedToken.accessToken;
	}

	const credentials = Buffer.from(
		`${MPESA_CONSUMER_KEY ?? ""}:${MPESA_CONSUMER_SECRET ?? ""}`,
	).toString("base64");

	const response = await fetch(`${getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
		method: "GET",
		headers: { Authorization: `Basic ${credentials}` },
	});

	if (!response.ok) return null;

	const data = (await response.json()) as OAuthResponse;
	if (!data.access_token) return null;

	cachedToken = {
		accessToken: data.access_token,
		expiresAt: Date.now() + Number(data.expires_in ?? "3600") * 1000,
	};

	return cachedToken.accessToken;
};

type StkPushResponse = {
	MerchantRequestID?: string;
	CheckoutRequestID?: string;
	ResponseCode?: string;
	ResponseDescription?: string;
	CustomerMessage?: string;
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
	// the body is the signal, not the http status
	if (!response.ok || raw.ResponseCode !== "0" || !raw.CheckoutRequestID) {
		return {
			success: false,
			error: raw.ResponseDescription ?? raw.CustomerMessage ?? "M-Pesa rejected the request.",
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

// --- callback parsing -------------------------------------------------------

const callbackMetadataItemSchema = z.object({
	Name: z.string(),
	Value: z.union([z.string(), z.number()]),
});

// the shape daraja posts back once the handset responds. result code 0 means the
// user paid; any other code is a cancellation or failure, in which case
// CallbackMetadata is absent
const stkCallbackSchema = z.object({
	Body: z.object({
		stkCallback: z.object({
			MerchantRequestID: z.string(),
			CheckoutRequestID: z.string(),
			ResultCode: z.number().int(),
			ResultDesc: z.string().optional(),
			CallbackMetadata: z
				.object({
					Item: z.array(callbackMetadataItemSchema),
				})
				.optional(),
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
	return items.find((item) => item.Name === name)?.Value;
};

export { getCallbackMetadataValue, initiateStkPush, parseStkCallback };
export type { StkCallback, StkPushResult };
