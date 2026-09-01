import { randomInt } from "node:crypto";
import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import {
	getCallbackMetadataValue,
	initiateStkPush,
	type StkCallback,
} from "@/lib/mpesa";
import { normalizeKenyanPhone } from "@/lib/phone";
import type { Payment, User } from "@/payload-types";

type Result<T = void> =
	| { success: true; data: T }
	| { success: false; error: string; code?: string };

type PaymentType = NonNullable<Payment["paymentType"]>;
type Tier = NonNullable<Payment["tier"]>;

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

// alphabet omits visually confusable characters and pairs with a crypto-secure
// randomInt, so references are unique without a modulo bias
const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const REFERENCE_LENGTH = 12; // daraja's AccountReference caps at 12 characters

const generateReference = (): string => {
	let reference = "";
	for (let i = 0; i < REFERENCE_LENGTH; i += 1) {
		reference += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
	}
	return reference;
};

const userLabel = (user: User): string => {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return name || user.email;
};

type PaymentInput = {
	paymentType: PaymentType;
	amount: number;
	phoneNumber: string;
	tier?: Tier;
};

// creates a payment record and fires the stk push. the record starts at
// `initiated` and lands at `stk_sent` only if daraja accepts the request; a
// rejected push lands at `failed`. nothing here ever confirms a payment — that
// is the callback's job in phase 4.2.
const initiatePayment = async (
	payload: Payload,
	actor: User,
	input: PaymentInput,
): Promise<Result<Payment>> => {
	// the role that owns the payment type is the only one allowed to initiate it
	if (input.paymentType === "verification" && actor.role !== "mjakazi") {
		return fail("Forbidden", "forbidden");
	}
	if (input.paymentType === "subscription" && actor.role !== "mwajiri") {
		return fail("Forbidden", "forbidden");
	}

	// amounts are integer ksh — no floats anywhere in the money path
	if (!Number.isInteger(input.amount) || input.amount < 1) {
		return fail("Invalid amount.", "invalid_amount");
	}

	if (input.paymentType === "subscription" && !input.tier) {
		return fail("A tier is required for a subscription payment.", "tier_required");
	}

	const phoneNumber = normalizeKenyanPhone(input.phoneNumber);
	if (!phoneNumber) {
		return fail("Invalid Kenyan phone number.", "invalid_phone");
	}

	const mpesaReference = generateReference();
	const initiatedAt = new Date().toISOString();

	let payment: Payment;
	try {
		payment = await payload.create({
			collection: "payments",
			data: {
				user: actor.id,
				paymentType: input.paymentType,
				status: "initiated",
				amount: input.amount,
				tier: input.paymentType === "subscription" ? (input.tier ?? null) : null,
				phoneNumber,
				mpesaReference,
				initiatedAt,
			},
			overrideAccess: true,
		});
	} catch (error) {
		console.error("[services/payment] create failed:", error);
		return fail("Could not record the payment.");
	}

	const push = await initiateStkPush({
		phoneNumber,
		amount: input.amount,
		accountReference: mpesaReference,
		description:
			input.paymentType === "verification"
				? "Mjakazi verification fee"
				: `Subscription — tier ${input.tier}`,
	});

	if (!push.success) {
		// daraja rejected the push before it reached the handset — mark failed
		try {
			await payload.update({
				collection: "payments",
				id: payment.id,
				data: { status: "failed", failedAt: new Date().toISOString() },
				overrideAccess: true,
			});
		} catch (error) {
			console.error("[services/payment] failed update failed:", error);
		}

		await writeAuditLog({
			action: "payment_failed",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: actor.id,
			previousState: "initiated",
			newState: "failed",
			metadata: {
				paymentId: payment.id,
				mpesaReference,
				amount: input.amount,
				paymentType: input.paymentType,
				error: push.error,
			},
		});

		return fail(push.error, "stk_rejected");
	}

	let updated: Payment;
	try {
		updated = await payload.update({
			collection: "payments",
			id: payment.id,
			data: {
				status: "stk_sent",
				merchantRequestId: push.merchantRequestId,
				checkoutRequestId: push.checkoutRequestId,
			},
			overrideAccess: true,
		});
	} catch (error) {
		console.error("[services/payment] stk_sent update failed:", error);
		return fail("Could not record the M-Pesa response.");
	}

	await writeAuditLog({
		action: "payment_initiated",
		actorId: actor.id,
		actorLabel: userLabel(actor),
		targetId: actor.id,
		previousState: "initiated",
		newState: "stk_sent",
		metadata: {
			paymentId: updated.id,
			mpesaReference,
			amount: input.amount,
			paymentType: input.paymentType,
			tier: input.tier ?? null,
		},
	});

	return { success: true, data: updated };
};

type CallbackStatus = "confirmed" | "failed" | "duplicate" | "not_found";

type CallbackOutcome = {
	status: CallbackStatus;
	payment?: Payment;
};

// the settled states a callback must never transition out of. daraja retries a
// callback that does not get a 200, so a payment already at one of these is a
// duplicate rather than a fresh confirmation
const TERMINAL_STATUSES: ReadonlyArray<Payment["status"]> = [
	"confirmed",
	"failed",
	"expired",
	"cancelled",
];

const isTerminal = (payment: Payment): boolean => TERMINAL_STATUSES.includes(payment.status);

// relationships come back as an id string at depth 0, or an object when
// populated. normalized to an id here
const toId = (
	value: string | { id?: string | number } | null | undefined,
): string | null => {
	if (!value) return null;
	if (typeof value === "string") return value;
	return typeof value.id === "number" ? String(value.id) : (value.id ?? null);
};

// moves a payment to its terminal state in one compare-and-swap write, stores
// the raw callback for audit, and writes the matching payment audit entry.
// nothing here triggers a domain transition — that is phase 4.4 / 5.2
const settleCallback = async (
	payload: Payload,
	payment: Payment,
	callback: StkCallback,
	nextStatus: "confirmed" | "failed",
	detail: {
		resultCode: number;
		resultDesc: string | null;
		reason?: string;
	},
): Promise<Result<CallbackOutcome>> => {
	const previousState = payment.status;
	const timestamp = new Date().toISOString();

	let updated: Payment;
	try {
		const result = await payload.update({
			collection: "payments",
			where: {
				and: [
					{ id: { equals: payment.id } },
					{ status: { equals: previousState } },
				],
			},
			data: {
				status: nextStatus,
				callbackPayload: callback,
				...(nextStatus === "confirmed"
					? { confirmedAt: timestamp }
					: { failedAt: timestamp }),
			},
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			// a concurrent callback settled it first — treated as a duplicate
			await writeAuditLog({
				action: "payment_duplicate",
				actorId: null,
				targetId: toId(payment.user),
				previousState,
				newState: previousState,
				metadata: {
					paymentId: payment.id,
					checkoutRequestId: payment.checkoutRequestId ?? null,
					resultCode: detail.resultCode,
				},
				source: "system",
			});
			return { success: true, data: { status: "duplicate", payment } };
		}

		updated = result.docs[0];
	} catch (error) {
		console.error("[services/payment] callback settle failed:", error);
		return fail("Could not record the callback.");
	}

	const receiptNumber = getCallbackMetadataValue(callback, "MpesaReceiptNumber");

	await writeAuditLog({
		action: nextStatus === "confirmed" ? "payment_confirmed" : "payment_failed",
		actorId: null,
		targetId: toId(payment.user),
		previousState,
		newState: nextStatus,
		metadata: {
			paymentId: payment.id,
			mpesaReference: payment.mpesaReference,
			amount: payment.amount,
			paymentType: payment.paymentType,
			tier: payment.tier ?? null,
			checkoutRequestId: payment.checkoutRequestId ?? null,
			resultCode: detail.resultCode,
			resultDesc: detail.resultDesc,
			...(nextStatus === "confirmed"
				? { mpesaReceiptNumber: receiptNumber ?? null }
				: {}),
			...(detail.reason ? { reason: detail.reason } : {}),
		},
		source: "system",
	});

	return { success: true, data: { status: nextStatus, payment: updated } };
};

// processes a daraja stk push callback. the callback is the only thing that may
// confirm a payment, so the success path verifies merchant correlation, amount
// and phone against the initiated record before writing `confirmed`. a callback
// that cannot be matched, has already been settled, or fails verification is
// ignored (audit-logged where appropriate) and never activates anything twice
const handleCallback = async (
	payload: Payload,
	callback: StkCallback,
): Promise<Result<CallbackOutcome>> => {
	const { MerchantRequestID, CheckoutRequestID, ResultCode, ResultDesc } =
		callback.Body.stkCallback;

	let payment: Payment | null;
	try {
		const result = await payload.find({
			collection: "payments",
			where: { checkoutRequestId: { equals: CheckoutRequestID } },
			limit: 1,
			overrideAccess: true,
		});
		payment = result.docs[0] ?? null;
	} catch (error) {
		console.error("[services/payment] callback lookup failed:", error);
		return fail("Could not look up the payment.");
	}

	if (!payment) {
		console.error(
			`[services/payment] callback for unknown CheckoutRequestID ${CheckoutRequestID}`,
		);
		return { success: true, data: { status: "not_found" } };
	}

	if (isTerminal(payment)) {
		await writeAuditLog({
			action: "payment_duplicate",
			actorId: null,
			targetId: toId(payment.user),
			previousState: payment.status,
			newState: payment.status,
			metadata: {
				paymentId: payment.id,
				checkoutRequestId: CheckoutRequestID,
				resultCode: ResultCode,
			},
			source: "system",
		});
		return { success: true, data: { status: "duplicate", payment } };
	}

	// verify the callback correlates to the push we actually sent before trusting
	// anything in it
	if (MerchantRequestID !== payment.merchantRequestId) {
		return settleCallback(payload, payment, callback, "failed", {
			resultCode: ResultCode,
			resultDesc: ResultDesc ?? null,
			reason: "merchant_request_mismatch",
		});
	}

	// result code 0 means the handset confirmed; anything else is a cancellation
	// or failure and carries no metadata
	if (ResultCode !== 0) {
		return settleCallback(payload, payment, callback, "failed", {
			resultCode: ResultCode,
			resultDesc: ResultDesc ?? null,
		});
	}

	const amountPaid = Number(getCallbackMetadataValue(callback, "Amount"));
	if (!Number.isInteger(amountPaid) || amountPaid !== payment.amount) {
		return settleCallback(payload, payment, callback, "failed", {
			resultCode: ResultCode,
			resultDesc: ResultDesc ?? null,
			reason: "amount_mismatch",
		});
	}

	const phonePaid = getCallbackMetadataValue(callback, "PhoneNumber");
	const normalizedPhone =
		phonePaid === undefined ? null : normalizeKenyanPhone(String(phonePaid));
	if (!normalizedPhone || normalizedPhone !== payment.phoneNumber) {
		return settleCallback(payload, payment, callback, "failed", {
			resultCode: ResultCode,
			resultDesc: ResultDesc ?? null,
			reason: "phone_mismatch",
		});
	}

	return settleCallback(payload, payment, callback, "confirmed", {
		resultCode: ResultCode,
		resultDesc: ResultDesc ?? null,
	});
};

// an stk push the worker never answers has a fixed window to be confirmed. past
// it the payment is expired and a late daraja callback is ignored as a duplicate.
// the timeout job polls this every minute, so a missed window self-corrects.
const STK_TIMEOUT_MINUTES = 2;

const expireTimedOutPayments = async (
	payload: Payload,
): Promise<{ expired: number }> => {
	const cutoff = new Date(Date.now() - STK_TIMEOUT_MINUTES * 60_000);

	let candidates: Payment[];
	try {
		// `status` is indexed; the window is applied in JS so the query stays on
		// the index and the result set stays bounded for an every-minute run
		const result = await payload.find({
			collection: "payments",
			where: { status: { equals: "stk_sent" } },
			limit: 100,
			overrideAccess: true,
		});
		candidates = result.docs;
	} catch (error) {
		console.error("[services/payment] timeout lookup failed:", error);
		return { expired: 0 };
	}

	let expired = 0;

	for (const payment of candidates) {
		// skip anything still inside the window, or missing an initiation time
		if (!payment.initiatedAt || new Date(payment.initiatedAt) > cutoff) continue;

		const previousState = payment.status;

		try {
			// compare-and-swap so a concurrent callback that settled the payment
			// wins and this run never double-applies
			const result = await payload.update({
				collection: "payments",
				where: {
					and: [
						{ id: { equals: payment.id } },
						{ status: { equals: "stk_sent" } },
					],
				},
				data: { status: "expired", expiredAt: new Date().toISOString() },
				overrideAccess: true,
			});

			if (result.docs.length === 0) continue;

			await writeAuditLog({
				action: "payment_expired",
				actorId: null,
				targetId: toId(payment.user),
				previousState,
				newState: "expired",
				metadata: {
					paymentId: payment.id,
					mpesaReference: payment.mpesaReference,
					checkoutRequestId: payment.checkoutRequestId ?? null,
					amount: payment.amount,
					paymentType: payment.paymentType,
					reason: `STK push not responded to within ${STK_TIMEOUT_MINUTES} minutes`,
				},
				source: "system",
			});

			expired += 1;
		} catch (error) {
			console.error("[services/payment] timeout expire failed:", error);
		}
	}

	return { expired };
};

export { expireTimedOutPayments, handleCallback, initiatePayment };
export type { CallbackOutcome, PaymentInput };
