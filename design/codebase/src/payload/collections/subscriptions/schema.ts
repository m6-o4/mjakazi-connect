import { isAdminOrSA, isRestricted } from "@/payload/access/access-control";
import type { CollectionConfig } from "payload";

// records every mwajiri subscription attempt as an immutable ledger
// mirrors the payments collection discipline — all writes are server-side only
const Subscriptions: CollectionConfig = {
	slug: "subscriptions",
	access: {
		create: isRestricted,
		update: isRestricted,
		delete: isRestricted,
		read: isAdminOrSA,
	},
	admin: {
		defaultColumns: ["account", "tierId", "status", "createdAt", "updatedAt"],
		group: "SaaS",
		useAsTitle: "tierId",
	},
	labels: { singular: "Subscription", plural: "Subscriptions" },
	timestamps: true,
	fields: [
		{
			// the mwajiri account this subscription belongs to
			name: "account",
			type: "relationship",
			relationTo: "accounts",
			required: true,
			index: true,
		},
		{
			// references the tierId from platform settings — stored as a plain string
			// so the record remains readable even if the tier is later renamed or removed
			name: "tierId",
			type: "text",
			label: "Tier ID",
			required: true,
			index: true,
		},
		{
			// human-readable tier name captured at purchase time — denormalised
			// so log entries remain accurate if the tier name changes later
			name: "tierName",
			type: "text",
			label: "Tier Name",
			required: true,
		},
		{
			name: "amount",
			type: "number",
			label: "Amount (KSh)",
			required: true,
		},
		{
			name: "currency",
			type: "text",
			label: "Currency",
			defaultValue: "KES",
			required: true,
		},
		{
			// mirrors payment collection status vocabulary where applicable
			// pending_activation sits between stk_sent and active
			name: "status",
			type: "select",
			label: "Status",
			required: true,
			index: true,
			options: [
				{ label: "STK Sent", value: "stk_sent" },
				{ label: "Active", value: "active" },
				{ label: "Failed", value: "failed" },
				{ label: "Expired", value: "expired" },
				{ label: "Cancelled", value: "cancelled" },
			],
			defaultValue: "stk_sent",
		},
		{
			name: "provider",
			type: "text",
			label: "Payment Provider",
			defaultValue: "mpesa",
			required: true,
		},
		{
			name: "phoneNumber",
			type: "text",
			label: "M-Pesa Phone Number",
			required: true,
		},
		{
			// daraja identifiers used to correlate the callback with this record
			name: "checkoutRequestId",
			type: "text",
			label: "Checkout Request ID",
			index: true,
		},
		{
			name: "merchantRequestId",
			type: "text",
			label: "Merchant Request ID",
		},
		{
			// populated on successful payment — primary reference for support queries
			name: "mpesaReceiptNumber",
			type: "text",
			label: "M-Pesa Receipt Number",
		},
		{
			// safaricom result codes and descriptions preserved for debugging
			name: "resultCode",
			type: "text",
			label: "Result Code",
		},
		{
			name: "resultDesc",
			type: "text",
			label: "Result Description",
		},
		{
			// subscription window — both set on activation, null until then
			name: "startDate",
			type: "date",
			label: "Start Date",
			admin: { readOnly: true },
		},
		{
			// expiry date drives both UI display and the inngest expiry function
			name: "endDate",
			type: "date",
			label: "End Date",
			index: true,
			admin: { readOnly: true },
		},
		{
			// duration captured at purchase time so expiry calculation is not
			// dependent on the tier still existing in platform settings
			name: "durationDays",
			type: "number",
			label: "Duration (Days)",
			required: true,
		},
	],
};

export { Subscriptions };
