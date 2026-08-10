import { isAdminOrSA, isRestricted } from "@/payload/access/access-control";
import type { CollectionConfig } from "payload";

// defines the payments collection for recording all mpesa stk push attempts
const Payments: CollectionConfig = {
	slug: "payments",
	// only admins and super admins can read payment records
	// all writes are performed server-side via api routes only
	access: {
		create: isRestricted,
		update: isRestricted,
		delete: isRestricted,
		read: isAdminOrSA,
	},
	// configures the admin interface for payment record management
	admin: {
		defaultColumns: [
			"account",
			"paymentType",
			"status",
			"amount",
			"createdAt",
			"updatedAt",
		],
		group: "SaaS",
		useAsTitle: "checkoutRequestId",
	},
	labels: { singular: "Payment", plural: "Payments" },
	// prevents client-side mutations — all writes go through payload local api server-side
	endpoints: false,
	fields: [
		// links the payment attempt to the mjakazi or mwajiri account that initiated it
		{
			name: "account",
			type: "relationship",
			relationTo: "accounts",
			required: true,
			label: "Account",
		},
		// distinguishes between mjakazi registration fees and mwajiri subscription payments
		{
			name: "paymentType",
			type: "select",
			required: true,
			label: "Payment Type",
			options: [
				{ label: "Registration", value: "registration" },
				{ label: "Subscription", value: "subscription" },
			],
		},
		// payment amount in minor units — 1500 for mjakazi registration, variable for mwajiri subscriptions
		{
			name: "amount",
			type: "number",
			required: true,
			label: "Amount (KES)",
			min: 1,
		},
		// currency is fixed to kes for all mpesa transactions
		{
			name: "currency",
			type: "select",
			required: true,
			label: "Currency",
			defaultValue: "KES",
			options: [{ label: "Kenyan Shilling (KES)", value: "KES" }],
		},
		// payment provider — mpesa only for now, extensible for future providers
		{
			name: "provider",
			type: "select",
			required: true,
			label: "Provider",
			defaultValue: "mpesa",
			options: [{ label: "M-Pesa", value: "mpesa" }],
		},
		// tracks the lifecycle of the stk push attempt
		{
			name: "status",
			type: "select",
			required: true,
			label: "Status",
			defaultValue: "stk_sent",
			options: [
				{ label: "STK Sent", value: "stk_sent" },
				{ label: "Confirmed", value: "confirmed" },
				{ label: "Failed", value: "failed" },
				{ label: "Expired", value: "expired" },
			],
		},
		// phone number in daraja-required format: 2547xxxxxxxx
		{
			name: "phoneNumber",
			type: "text",
			required: true,
			label: "Phone Number",
		},
		// safaricom's primary identifier for this stk push request — used as idempotency key
		{
			name: "checkoutRequestId",
			type: "text",
			required: true,
			label: "Checkout Request ID",
			unique: true,
		},
		// safaricom's secondary identifier returned alongside checkoutRequestId
		{
			name: "merchantRequestId",
			type: "text",
			required: true,
			label: "Merchant Request ID",
		},
		// safaricom's transaction receipt number — only populated on confirmed payments
		{
			name: "mpesaReceiptNumber",
			type: "text",
			label: "M-Pesa Receipt Number",
		},
		// raw result code from safaricom callback — 0 means success
		{
			name: "resultCode",
			type: "text",
			label: "Result Code",
		},
		// human-readable result description from safaricom callback
		{
			name: "resultDesc",
			type: "text",
			label: "Result Description",
		},
	],
};

export { Payments };
