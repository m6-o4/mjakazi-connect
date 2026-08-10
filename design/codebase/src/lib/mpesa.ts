// server-side only — never import this in client components

// ---------------------------------------------------------------------------
// types
// ---------------------------------------------------------------------------

// raw shape returned by Daraja's OAuth endpoint
interface DarajaAuthResponse {
	access_token: string;
	expires_in: string;
}

// full payload Daraja expects when initiating an STK push
interface STKPushPayload {
	BusinessShortCode: string;
	Password: string;
	Timestamp: string;
	TransactionType: string;
	Amount: number;
	PartyA: string;
	PartyB: string;
	PhoneNumber: string;
	CallBackURL: string;
	AccountReference: string;
	TransactionDesc: string;
}

// what Daraja returns after accepting an STK push request
export interface STKPushResponse {
	MerchantRequestID: string;
	CheckoutRequestID: string;
	ResponseCode: string;
	ResponseDescription: string;
	CustomerMessage: string;
}

// caller-facing options — phone number must already be normalised before passing in
export interface STKPushOptions {
	phoneNumber: string; // 2547xxxxxxxx format
	amount: number;
	accountReference: string; // label that appears on the user's M-Pesa statement
	transactionDesc: string;
}

// ---------------------------------------------------------------------------
// environment resolution
// ---------------------------------------------------------------------------

// sandbox and production point to entirely different Daraja hosts,
// so we resolve the base URL at call time rather than hardcoding one
const getDarajaBaseUrl = (): string => {
	const env = process.env.MPESA_ENVIRONMENT;
	return env === "production"
		? "https://api.safaricom.co.ke"
		: "https://sandbox.safaricom.co.ke";
};

// ---------------------------------------------------------------------------
// phone number normalisation
// ---------------------------------------------------------------------------

// Daraja requires the 254 country code with no leading + or 0;
// this covers every common format a Kenyan user is likely to enter
export const normaliseMpesaPhone = (raw: string): string => {
	const cleaned = raw.trim().replace(/\s+/g, "");

	// +254… — strip the plus, country code already present
	if (cleaned.startsWith("+254")) {
		return cleaned.slice(1);
	}

	// 254… — already in the correct format
	if (cleaned.startsWith("254")) {
		return cleaned;
	}

	// 0… — local format, swap the leading zero for the country code
	if (cleaned.startsWith("0")) {
		return "254" + cleaned.slice(1);
	}

	// bare subscriber number — prepend country code directly
	return "254" + cleaned;
};

// validates format only — 254 followed by 9 digits starting with 7 or 1
// network-level validation is intentionally left to Safaricom because number
// portability means prefixes no longer reliably identify the operator
export const isValidKenyanMobileNumber = (normalised: string): boolean => {
	return /^254(7|1)\d{8}$/.test(normalised);
};

// ---------------------------------------------------------------------------
// oauth token
// ---------------------------------------------------------------------------

// tokens are short-lived (1 hour); fetching fresh per request is simpler
// than maintaining a cache and avoids stale-token failures in production
export const getDarajaToken = async (): Promise<string> => {
	const consumerKey = process.env.MPESA_CONSUMER_KEY;
	const consumerSecret = process.env.MPESA_CONSUMER_SECRET;

	if (!consumerKey || !consumerSecret) {
		throw new Error("MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET is not set");
	}

	// Daraja uses HTTP Basic auth — credentials are base64-encoded key:secret
	const credentials = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
	const baseUrl = getDarajaBaseUrl();

	const response = await fetch(
		`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
		{
			method: "GET",
			headers: {
				Authorization: `Basic ${credentials}`,
				"Content-Type": "application/json",
			},
		},
	);

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`Daraja OAuth failed: ${response.status} — ${error}`);
	}

	const data = (await response.json()) as DarajaAuthResponse;

	if (!data.access_token) {
		throw new Error("Daraja OAuth returned no access token");
	}

	return data.access_token;
};

// ---------------------------------------------------------------------------
// stk push password
// ---------------------------------------------------------------------------

// Daraja derives request authenticity from this one-time password;
// it must be recomputed per request because it embeds the current timestamp
// formula: base64(shortcode + passkey + timestamp)
const generateStkPassword = (timestamp: string): { password: string } => {
	const shortCode = process.env.MPESA_SHORTCODE;
	const passkey = process.env.MPESA_PASSKEY;

	if (!shortCode || !passkey) {
		throw new Error("MPESA_SHORTCODE or MPESA_PASSKEY is not set");
	}

	const raw = `${shortCode}${passkey}${timestamp}`;
	const password = Buffer.from(raw).toString("base64");

	return { password };
};

// Daraja rejects any timestamp format other than YYYYMMDDHHmmss
export const generateTimestamp = (): string => {
	const now = new Date();
	const pad = (n: number) => String(n).padStart(2, "0");

	return (
		String(now.getFullYear()) +
		pad(now.getMonth() + 1) +
		pad(now.getDate()) +
		pad(now.getHours()) +
		pad(now.getMinutes()) +
		pad(now.getSeconds())
	);
};

// ---------------------------------------------------------------------------
// stk push initiation
// ---------------------------------------------------------------------------

// triggers the STK push prompt on the user's phone via Daraja;
// the caller must persist CheckoutRequestID and MerchantRequestID
// to correlate this request with the eventual payment callback
export const initiateSTKPush = async (
	options: STKPushOptions,
): Promise<STKPushResponse> => {
	const shortCode = process.env.MPESA_SHORTCODE;
	const callbackUrl = process.env.MPESA_CALLBACK_URL;

	if (!shortCode || !callbackUrl) {
		throw new Error("MPESA_SHORTCODE or MPESA_CALLBACK_URL is not set");
	}

	const token = await getDarajaToken();
	const timestamp = generateTimestamp();
	const { password } = generateStkPassword(timestamp);
	const baseUrl = getDarajaBaseUrl();

	const payload: STKPushPayload = {
		BusinessShortCode: shortCode,
		Password: password,
		Timestamp: timestamp,
		TransactionType: "CustomerPayBillOnline",
		Amount: options.amount,
		PartyA: options.phoneNumber, // the paying subscriber
		PartyB: shortCode, // the receiving till or paybill
		PhoneNumber: options.phoneNumber,
		CallBackURL: callbackUrl,
		AccountReference: options.accountReference,
		TransactionDesc: options.transactionDesc,
	};

	const response = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${token}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const error = await response.text();
		throw new Error(`STK Push request failed: ${response.status} — ${error}`);
	}

	const data = (await response.json()) as STKPushResponse;

	// ResponseCode "0" means Daraja has queued the push — not that the user has paid;
	// actual payment confirmation arrives via the callback URL
	if (data.ResponseCode !== "0") {
		throw new Error(`STK Push rejected by Daraja: ${data.ResponseDescription}`);
	}

	return data;
};
