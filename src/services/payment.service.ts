import { randomInt } from "node:crypto";
import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import { initiateStkPush } from "@/lib/mpesa";
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

export { initiatePayment };
export type { PaymentInput };
