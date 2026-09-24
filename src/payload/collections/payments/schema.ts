import type { CollectionConfig } from "payload";

import { isAdminOrOwner, isRestricted } from "@/payload/access/access-control";

// the immutable money ledger. one record per m-pesa transaction attempt.
// the collection is sealed — create/update/delete are refused at payload's own
// surface and happen only through the payment service, which authorizes each
// action and enforces the status state machine. a confirmed payment is terminal:
// nothing in the service ever moves a payment out of `confirmed`.
//
// `mpesaReference` is our own unique business reference, minted at initiation and
// passed to daraja as `AccountReference`. `checkoutRequestId` is daraja's unique
// per-push id — the key the callback uses to find the record and reject duplicates.
//
// a payment reaches `confirmed` one of two ways: the callback, which carries the
// `mpesaReceiptNumber` in its metadata, or a hand reconciliation when the callback
// never arrived — a staff or admin member recording the receipt from the payer's
// own SMS. `reconciledBy`/`reconciledAt` mark the second way so the two are never
// confused in the ledger. no path confirms a payment without a receipt.
const Payments: CollectionConfig = {
	slug: "payments",
	labels: { singular: "Payment", plural: "Payments" },
	admin: {
		useAsTitle: "mpesaReference",
		defaultColumns: [
			"mpesaReference",
			"paymentType",
			"status",
			"amount",
			"user",
			"createdAt",
		],
		group: "SaaS",
	},
	access: {
		create: isRestricted,
		read: isAdminOrOwner("user"),
		update: isRestricted,
		delete: isRestricted,
	},
	fields: [
		{
			name: "user",
			type: "relationship",
			relationTo: "users",
			label: "Payer",
			required: true,
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "paymentType",
			type: "select",
			label: "Payment Type",
			required: true,
			options: [
				{ label: "Verification", value: "verification" },
				{ label: "Subscription", value: "subscription" },
			],
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "status",
			type: "select",
			label: "Status",
			required: true,
			defaultValue: "initiated",
			index: true,
			options: [
				{ label: "Initiated", value: "initiated" },
				{ label: "STK Sent", value: "stk_sent" },
				{ label: "Callback Received", value: "callback_received" },
				{ label: "Confirmed", value: "confirmed" },
				{ label: "Failed", value: "failed" },
				{ label: "Expired", value: "expired" },
				{ label: "Cancelled", value: "cancelled" },
			],
		},
		{
			name: "amount",
			type: "number",
			label: "Amount (KSh)",
			required: true,
			min: 1,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			// snapshots from platform-settings at purchase, so the payment stays
			// readable even if the tier is later renamed or removed. only present
			// for subscription payments
			name: "tierId",
			type: "text",
			label: "Tier ID",
			admin: {
				readOnly: true,
				position: "sidebar",
				condition: (data) => data?.paymentType === "subscription",
			},
		},
		{
			name: "tierName",
			type: "text",
			label: "Tier Name",
			admin: {
				readOnly: true,
				position: "sidebar",
				condition: (data) => data?.paymentType === "subscription",
			},
		},
		{
			// the duration is snapshotted with the tier identity because the
			// subscription stacking carry-over has to reproduce the cycle that was
			// actually in force when this payment was made. reading it live from
			// platform-settings would let a later admin edit change the arithmetic
			// applied to a window that was already paid for. the amount actually
			// paid is already snapshotted as `amount`, so the price needs no
			// second field
			name: "tierDurationDays",
			type: "number",
			label: "Tier Duration (Days)",
			min: 1,
			admin: {
				readOnly: true,
				position: "sidebar",
				condition: (data) => data?.paymentType === "subscription",
			},
		},
		{
			name: "phoneNumber",
			type: "text",
			label: "Phone Number",
			admin: { readOnly: true },
		},
		{
			name: "mpesaReference",
			type: "text",
			label: "M-Pesa Reference",
			required: true,
			unique: true,
			index: true,
			admin: { readOnly: true },
		},
		{
			// the code from the payer's m-pesa confirmation sms. it arrives only in
			// the callback, and never in the express query response, so a payment
			// completed by hand carries the receipt a person read out instead
			name: "mpesaReceiptNumber",
			type: "text",
			label: "M-Pesa Receipt",
			index: true,
			admin: {
				readOnly: true,
				description:
					"The M-Pesa receipt from the payer's confirmation SMS, or from the callback.",
			},
		},
		{
			name: "merchantRequestId",
			type: "text",
			label: "Merchant Request ID",
			admin: { readOnly: true },
		},
		{
			name: "checkoutRequestId",
			type: "text",
			label: "Checkout Request ID",
			index: true,
			admin: { readOnly: true },
		},
		{
			name: "callbackPayload",
			type: "json",
			label: "Callback Payload",
			admin: {
				readOnly: true,
				description: "The raw daraja callback body, stored whole for audit.",
			},
		},
		{
			name: "initiatedAt",
			type: "date",
			label: "Initiated At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "confirmedAt",
			type: "date",
			label: "Confirmed At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			// set when the reconciliation sweep has asked m-pesa what happened to
			// this push. it exists so each payment is asked about exactly once, no
			// matter how often the sweep runs, and so the queue cadence never decides
			// how many times daraja is called
			name: "mpesaStatusCheckedAt",
			type: "date",
			label: "M-Pesa Status Checked At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "failedAt",
			type: "date",
			label: "Failed At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "expiredAt",
			type: "date",
			label: "Expired At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			// set only when a person completed the payment by hand from the payer's
			// receipt, because the callback never arrived. empty for every payment
			// the callback settled
			name: "reconciledBy",
			type: "relationship",
			relationTo: "users",
			label: "Reconciled By",
			admin: {
				readOnly: true,
				position: "sidebar",
				description: "The staff or admin member who confirmed this payment by hand.",
			},
		},
		{
			name: "reconciledAt",
			type: "date",
			label: "Reconciled At",
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	timestamps: true,
};

export { Payments };
