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
const Payments: CollectionConfig = {
	slug: "payments",
	labels: { singular: "Payment", plural: "Payments" },
	admin: {
		useAsTitle: "mpesaReference",
		defaultColumns: ["mpesaReference", "paymentType", "status", "amount", "user", "createdAt"],
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
			name: "tier",
			type: "select",
			label: "Tier",
			options: [
				{ label: "Tier 1", value: "1" },
				{ label: "Tier 2", value: "2" },
				{ label: "Tier 3", value: "3" },
			],
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
	],
	timestamps: true,
};

export { Payments };
