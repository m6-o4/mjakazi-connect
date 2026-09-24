import { randomInt } from "node:crypto";
import { subMinutes } from "date-fns";
import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import {
	getCallbackMetadataValue,
	initiateStkPush,
	queryStkStatus,
	type StkCallback,
} from "@/lib/mpesa";
import { normalizeKenyanPhone } from "@/lib/phone";
import { captureServerEvent } from "@/lib/posthog-server";
import type { Payment, User } from "@/payload-types";
import { activateSubscriptionOnPayment } from "@/services/subscription.service";
import { activateVerificationOnPayment } from "@/services/verification.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type PaymentType = NonNullable<Payment["paymentType"]>;

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
	// tier snapshots — required for subscription payments, null for verification.
	// the duration is snapshotted so the subscription stacking carry-over can
	// reproduce the cycle this payment bought, without reading live settings
	tierId?: string | null;
	tierName?: string | null;
	tierDurationDays?: number | null;
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

	if (input.paymentType === "subscription" && !input.tierId) {
		return fail("A tier is required for a subscription payment.", "tier_required");
	}

	// the duration is snapshotted onto the payment because the subscription
	// stacking carry-over reproduces this cycle later. a subscription payment
	// without a usable duration could not be read back, so it is refused here
	// rather than discovered at the next purchase
	if (
		input.paymentType === "subscription" &&
		(!Number.isInteger(input.tierDurationDays) || (input.tierDurationDays ?? 0) < 1)
	) {
		return fail("The tier duration is required.", "tier_duration_required");
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
				tierId: input.paymentType === "subscription" ? (input.tierId ?? null) : null,
				tierName: input.paymentType === "subscription" ? (input.tierName ?? null) : null,
				tierDurationDays:
					input.paymentType === "subscription" ? (input.tierDurationDays ?? null) : null,
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
		// daraja caps TransactionDesc at 13 characters. the tier name used to be
		// appended here, which broke the documented limit without ever failing the
		// push; the unique reference the customer sees is `AccountReference`
		description: input.paymentType === "verification" ? "Verification" : "Subscription",
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
			tierId: input.tierId ?? null,
			tierName: input.tierName ?? null,
			tierDurationDays: input.tierDurationDays ?? null,
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

const isTerminal = (payment: Payment): boolean =>
	TERMINAL_STATUSES.includes(payment.status);

// relationships come back as an id string at depth 0, or an object when
// populated. normalized to an id here
const toId = (
	value: string | { id?: string | number } | null | undefined,
): string | null => {
	if (!value) return null;
	if (typeof value === "string") return value;
	return typeof value.id === "number" ? String(value.id) : (value.id ?? null);
};

// staff and admin may both complete a payment by hand. it is the same authority
// that reads the verification queue, so it is checked the same way
const isStaff = (user: User): boolean => user.role === "admin" || user.role === "staff";

// resolves the payer's clerk id so server-side analytics events land on the same
// person the browser identified (clerk id, not the payload object id), then
// captures. fire-and-forget — an analytics miss never affects the payment path
const capturePaymentEvent = async (
	payload: Payload,
	payment: Payment,
	event: "payment_completed" | "payment_failed",
	properties: Record<string, string | number | boolean | null>,
): Promise<void> => {
	try {
		const userId = toId(payment.user);
		if (!userId) return;

		let distinctId = userId;
		const user = await payload.findByID({ collection: "users", id: userId, depth: 0 });
		if (user?.clerkId) distinctId = user.clerkId;

		captureServerEvent({ distinctId, event, properties });
	} catch (error) {
		console.error(`[services/payment] capture ${event} failed:`, error);
	}
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
	// the receipt exists only in the callback's metadata. captured before the write
	// so it lands on the record itself rather than only inside the raw payload
	const receiptValue = getCallbackMetadataValue(callback, "MpesaReceiptNumber");
	const receiptNumber = receiptValue === undefined ? null : String(receiptValue);

	let updated: Payment;
	try {
		const result = await payload.update({
			collection: "payments",
			where: {
				and: [{ id: { equals: payment.id } }, { status: { equals: previousState } }],
			},
			data: {
				status: nextStatus,
				callbackPayload: callback,
				...(nextStatus === "confirmed" && receiptNumber
					? { mpesaReceiptNumber: receiptNumber }
					: {}),
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
			tierId: payment.tierId ?? null,
			tierName: payment.tierName ?? null,
			tierDurationDays: payment.tierDurationDays ?? null,
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

	await capturePaymentEvent(
		payload,
		payment,
		nextStatus === "confirmed" ? "payment_completed" : "payment_failed",
		nextStatus === "confirmed"
			? { paymentType: payment.paymentType, tierId: payment.tierId ?? null }
			: {
					paymentType: payment.paymentType,
					reason: detail.reason ?? (detail.resultCode !== 0 ? "cancelled" : "failed"),
				},
	);

	return { success: true, data: { status: nextStatus, payment: updated } };
};

// runs the domain transition a confirmed payment owes: pending_payment → review
// for a verification, the subscription window for a subscription. shared by the
// callback path and the hand-reconciliation path so a payment completed either way
// behaves identically. a failed activation leaves the payment confirmed and
// immutable and is audit-logged for investigation — it is never rolled back
const activateConfirmedPayment = async (
	payload: Payload,
	payment: Payment,
): Promise<void> => {
	const activation =
		payment.paymentType === "verification"
			? await activateVerificationOnPayment(payload, payment)
			: await activateSubscriptionOnPayment(payload, payment);

	if (activation.success) return;

	console.error(
		`[services/payment] ${payment.paymentType} activation failed for payment ${payment.id}:`,
		activation.error,
	);

	await writeAuditLog({
		action: "payment_activation_failed",
		actorId: null,
		targetId: toId(payment.user),
		// a verification activation can only be attempted from
		// pending_payment; a subscription activation can come from several
		// states, so it carries no state here
		previousState: payment.paymentType === "verification" ? "pending_payment" : null,
		newState: payment.paymentType === "verification" ? "pending_payment" : null,
		metadata: {
			paymentId: payment.id,
			mpesaReference: payment.mpesaReference,
			paymentType: payment.paymentType,
			error: activation.error,
			code: activation.code ?? null,
		},
		source: "system",
	});
};

// records that daraja posted to the callback route, before anything is decided
// about the payload. every callback is answered 200 so daraja never re-sends, so
// an arrival we cannot match or parse would otherwise leave no trace at all and
// be indistinguishable in the records from one that was never delivered. this
// entry is the only thing that tells those two cases apart, and it is what makes
// a missing confirmation diagnosable rather than a mystery
const recordCallbackArrival = async (
	payload: Payload,
	input: { raw: string; callback: StkCallback | null },
): Promise<void> => {
	const body = input.callback?.Body.stkCallback;

	await writeAuditLog({
		action: "payment_callback_received",
		actorId: null,
		targetId: null,
		metadata: {
			parsed: Boolean(input.callback),
			checkoutRequestId: body?.CheckoutRequestID ?? null,
			merchantRequestId: body?.MerchantRequestID ?? null,
			resultCode: body?.ResultCode ?? null,
			resultDesc: body?.ResultDesc ?? null,
			// the raw body is kept only when we could not read it — a parsed
			// callback stores its own payload on the payment record. it is capped
			// because this endpoint is public and the body is attacker-controlled
			...(input.callback ? {} : { rawBody: input.raw.slice(0, 2000) }),
		},
		source: "system",
	});
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

	const settled = await settleCallback(payload, payment, callback, "confirmed", {
		resultCode: ResultCode,
		resultDesc: ResultDesc ?? null,
	});

	// 4.4 / 5.2: a confirmed payment activates its domain transition. a failed
	// activation leaves the payment confirmed (immutable) and is audit-logged
	// for investigation — it is never rolled back
	if (settled.success && settled.data.status === "confirmed" && settled.data.payment) {
		const payment = settled.data.payment;
		await activateConfirmedPayment(payload, payment);
	}

	return settled;
};

// how long a push may stay unanswered before we stop waiting and ask m-pesa what
// happened to it. this is the window the product promises: a customer should know
// where they stand within about two minutes
const STK_TIMEOUT_MINUTES = 2;

type ReconcileSweepOutcome = {
	checked: number;
	paid: number;
	failed: number;
	unresolved: number;
};

// records that this payment has been asked about, so the sweep never asks twice
// and daraja is never polled about the same push again
const stampStatusChecked = async (
	payload: Payload,
	paymentId: string,
	checkedAt: string,
): Promise<void> => {
	try {
		await payload.update({
			collection: "payments",
			id: paymentId,
			data: { mpesaStatusCheckedAt: checkedAt },
			overrideAccess: true,
		});
	} catch (error) {
		console.error("[services/payment] status-check stamp failed:", error);
	}
};

// the reconciliation sweep. it replaces a blind expiry: a payment is never written
// off because time passed, only because m-pesa says the push did not complete.
// three outcomes:
//   paid      → nothing is written. a receipt is required to confirm and the query
//               can never supply one, so the payment stays `stk_sent` and appears
//               on the staff list to be completed from the payer's SMS
//   not paid  → `failed`, carrying m-pesa's own result code as the reason
//   no answer → left exactly as it is, for staff
//
// each payment is asked about once, tracked by `mpesaStatusCheckedAt`, so the queue
// cadence never decides how often daraja is called — which matters because the
// in-process job runner is not reliable enough to assume a run per minute
const reconcileTimedOutPayments = async (
	payload: Payload,
): Promise<ReconcileSweepOutcome> => {
	const cutoff = subMinutes(new Date(), STK_TIMEOUT_MINUTES);

	let candidates: Payment[];
	try {
		// one ask per payment, enforced by the where clause rather than by cadence.
		// `status` and `mpesaStatusCheckedAt` are both indexed and the result set is
		// bounded, so this stays cheap however often it runs
		const result = await payload.find({
			collection: "payments",
			where: {
				and: [
					{ status: { equals: "stk_sent" } },
					{ mpesaStatusCheckedAt: { exists: false } },
				],
			},
			limit: 100,
			overrideAccess: true,
		});
		candidates = result.docs;
	} catch (error) {
		console.error("[services/payment] reconciliation lookup failed:", error);
		return { checked: 0, paid: 0, failed: 0, unresolved: 0 };
	}

	const outcome: ReconcileSweepOutcome = {
		checked: 0,
		paid: 0,
		failed: 0,
		unresolved: 0,
	};
	const checkedAt = new Date().toISOString();

	for (const payment of candidates) {
		if (!payment.checkoutRequestId || !payment.initiatedAt) continue;
		// still inside the promise window — not yet our business
		if (new Date(payment.initiatedAt) > cutoff) continue;

		outcome.checked += 1;

		const query = await queryStkStatus(payment.checkoutRequestId);

		if (!query.success) {
			// inconclusive is never a "not paid" verdict, so the status is untouched,
			// but the check is stamped so this payment is never asked about again
			outcome.unresolved += 1;
			await stampStatusChecked(payload, payment.id, checkedAt);
			continue;
		}

		if (query.paid) {
			// the customer paid, the callback never arrived, and the query cannot give
			// us the receipt. this is recorded as evidence and the payment is left at
			// `stk_sent` so it shows on the staff list — the profile is deliberately
			// NOT advanced, because no payment is ever confirmed without a receipt
			outcome.paid += 1;
			// stamped first: the audit entry is the record of a paid-but-unreceipted
			// payment, and a failed stamp must not let the sweep ask again
			await stampStatusChecked(payload, payment.id, checkedAt);
			await writeAuditLog({
				action: "payment_confirmation_missing",
				actorId: null,
				targetId: toId(payment.user),
				previousState: payment.status,
				newState: payment.status,
				metadata: {
					paymentId: payment.id,
					mpesaReference: payment.mpesaReference,
					checkoutRequestId: payment.checkoutRequestId,
					amount: payment.amount,
					paymentType: payment.paymentType,
					resultCode: query.resultCode,
					resultDesc: query.resultDesc,
					reason: "M-Pesa reports the payment succeeded but no callback arrived",
				},
				source: "system",
			});
			continue;
		}

		// m-pesa says the push did not complete — the one case where writing the
		// payment off is safe, because no money moved
		try {
			const result = await payload.update({
				collection: "payments",
				where: {
					and: [{ id: { equals: payment.id } }, { status: { equals: "stk_sent" } }],
				},
				data: {
					status: "failed",
					failedAt: checkedAt,
					mpesaStatusCheckedAt: checkedAt,
				},
				overrideAccess: true,
			});

			if (result.docs.length === 0) continue;

			outcome.failed += 1;

			await writeAuditLog({
				action: "payment_failed",
				actorId: null,
				targetId: toId(payment.user),
				previousState: "stk_sent",
				newState: "failed",
				metadata: {
					paymentId: payment.id,
					mpesaReference: payment.mpesaReference,
					checkoutRequestId: payment.checkoutRequestId,
					amount: payment.amount,
					paymentType: payment.paymentType,
					resultCode: query.resultCode,
					resultDesc: query.resultDesc,
					reason: "M-Pesa reports the push did not complete",
				},
				source: "system",
			});

			await capturePaymentEvent(payload, payment, "payment_failed", {
				paymentType: payment.paymentType,
				reason: "not_completed",
			});
		} catch (error) {
			console.error("[services/payment] reconciliation write failed:", error);
		}
	}

	return outcome;
};

// daraja receipts are ten alphanumeric characters. the range is tolerated rather
// than pinned so a format change upstream cannot stop a real payment being
// completed, while obvious typos and pasted prose still fail loudly
const MPESA_RECEIPT_PATTERN = /^[A-Z0-9]{8,12}$/;

// completes a payment by hand when the callback never arrived. the receipt is the
// whole point: the confirmation SMS to the payer is the only proof the money moved,
// and neither the status query nor anything else can produce that code, so a person
// reads it out and it is recorded against the payment. staff and admin only, only
// while the payment is still in flight, and never for one that has already settled
const reconcilePayment = async (
	payload: Payload,
	actor: User,
	input: { paymentId: string; mpesaReceiptNumber: string },
): Promise<Result<Payment>> => {
	if (!isStaff(actor)) return fail("Forbidden", "forbidden");

	const receipt = input.mpesaReceiptNumber.trim().toUpperCase();
	if (!MPESA_RECEIPT_PATTERN.test(receipt)) {
		return fail(
			"Enter the M-Pesa receipt exactly as it appears in the SMS.",
			"invalid_receipt",
		);
	}

	let payment: Payment | null = null;
	try {
		payment = (await payload.findByID({
			collection: "payments",
			id: input.paymentId,
			depth: 0,
			overrideAccess: true,
		})) as Payment;
	} catch (error) {
		console.error("[services/payment] reconciliation lookup failed:", error);
	}

	if (!payment) return fail("Payment not found.", "not_found");

	if (isTerminal(payment)) {
		return fail(
			payment.status === "confirmed"
				? "This payment is already confirmed."
				: "This payment has already been closed.",
			"already_settled",
		);
	}

	if (payment.status !== "stk_sent") {
		return fail("This payment is not waiting on confirmation.", "wrong_state");
	}

	const previousState = payment.status;
	const timestamp = new Date().toISOString();

	let updated: Payment;
	try {
		// compare-and-swap, so a callback that settles the payment at the same moment
		// wins and this never double-applies
		const result = await payload.update({
			collection: "payments",
			where: {
				and: [{ id: { equals: payment.id } }, { status: { equals: previousState } }],
			},
			data: {
				status: "confirmed",
				confirmedAt: timestamp,
				mpesaReceiptNumber: receipt,
				reconciledBy: actor.id,
				reconciledAt: timestamp,
			},
			overrideAccess: true,
		});

		if (result.docs.length === 0) {
			return fail("This payment was settled by another action.", "already_settled");
		}

		updated = result.docs[0];
	} catch (error) {
		console.error("[services/payment] reconciliation write failed:", error);
		return fail("Could not confirm the payment.");
	}

	await writeAuditLog({
		action: "payment_reconciled",
		actorId: actor.id,
		actorLabel: userLabel(actor),
		targetId: toId(payment.user),
		previousState,
		newState: "confirmed",
		reason: "Confirmed by hand from the payer's M-Pesa receipt",
		metadata: {
			paymentId: payment.id,
			mpesaReference: payment.mpesaReference,
			checkoutRequestId: payment.checkoutRequestId ?? null,
			amount: payment.amount,
			paymentType: payment.paymentType,
			tierId: payment.tierId ?? null,
			tierName: payment.tierName ?? null,
			tierDurationDays: payment.tierDurationDays ?? null,
			mpesaReceiptNumber: receipt,
		},
		source: "user",
	});

	await activateConfirmedPayment(payload, updated);

	return { success: true, data: updated };
};

// the payments staff have to finish by hand: pushed, never confirmed, never failed.
// these are the ones a lost callback strands. the payer's name is resolved so the
// list is usable. a payment the sweep already reported as paid carries a
// `payment_confirmation_missing` audit entry, which is where that evidence lives
type StuckPayment = {
	id: string;
	paymentType: PaymentType;
	amount: number;
	phoneNumber: string | null;
	mpesaReference: string;
	payerName: string | null;
	initiatedAt: string | null;
};

const listStuckPayments = async (payload: Payload): Promise<StuckPayment[]> => {
	try {
		const result = await payload.find({
			collection: "payments",
			where: { status: { equals: "stk_sent" } },
			sort: "initiatedAt",
			limit: 100,
			depth: 1,
			overrideAccess: true,
		});

		return result.docs
			.filter(
				(payment) =>
					payment.initiatedAt &&
					new Date(payment.initiatedAt) < subMinutes(new Date(), STK_TIMEOUT_MINUTES),
			)
			.map((payment) => {
				const payer = typeof payment.user === "object" ? payment.user : null;
				const name = payer
					? [payer.firstName, payer.lastName].filter(Boolean).join(" ").trim()
					: "";

				return {
					id: payment.id,
					paymentType: payment.paymentType,
					amount: payment.amount,
					phoneNumber: payment.phoneNumber ?? null,
					mpesaReference: payment.mpesaReference,
					payerName: name || (payer?.email ?? null),
					initiatedAt: payment.initiatedAt ?? null,
				};
			});
	} catch (error) {
		console.error("[services/payment] stuck payment lookup failed:", error);
		return [];
	}
};

// the caller's most recent payment of a given type. the pay pages read this after
// a poll refresh to detect that a freshly initiated payment has settled at
// `confirmed`, so the ui can show an explicit "payment received" cue. read-only;
// the caller supplies their own session user id
const getLatestPaymentForUser = async (
	payload: Payload,
	userId: string,
	paymentType: PaymentType,
): Promise<Payment | null> => {
	try {
		const result = await payload.find({
			collection: "payments",
			where: {
				and: [{ user: { equals: userId } }, { paymentType: { equals: paymentType } }],
			},
			sort: "-createdAt",
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		return result.docs[0] ?? null;
	} catch (error) {
		console.error("[services/payment] latest payment lookup failed:", error);
		return null;
	}
};

export {
	getLatestPaymentForUser,
	handleCallback,
	initiatePayment,
	listStuckPayments,
	reconcilePayment,
	reconcileTimedOutPayments,
	recordCallbackArrival,
};
export type { CallbackOutcome, PaymentInput, StuckPayment };
