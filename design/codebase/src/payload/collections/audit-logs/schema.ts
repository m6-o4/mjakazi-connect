import { isAdminOrSA, isRestricted } from "@/payload/access/access-control";
import type { CollectionConfig } from "payload";

// immutable audit trail for all significant platform events.
// entries are written programmatically via writeAuditLog — never by users directly.
const AuditLogs: CollectionConfig = {
	slug: "audit-logs",
	access: {
		// audit logs must never be created, modified, or removed through the UI or API —
		// all writes go through writeAuditLog with overrideAccess so these stay locked down
		create: isRestricted,
		update: isRestricted,
		delete: isRestricted,
		// only admins and super-admins can read the audit trail
		read: isAdminOrSA,
	},
	admin: {
		useAsTitle: "action",
		defaultColumns: ["action", "actorLabel", "targetLabel", "createdAt", "updatedAt"],
		group: "SaaS",
	},
	labels: { singular: "Audit Log", plural: "Audit Logs" },
	timestamps: true,
	fields: [
		{
			// the specific event that occurred — drives filtering and reporting
			name: "action",
			type: "select",
			required: true,
			index: true,
			options: [
				// account lifecycle
				{ label: "Account Created", value: "account_created" },
				{ label: "Account Updated", value: "account_updated" },
				{ label: "Account Deleted", value: "account_deleted" },
				// verification lifecycle
				{ label: "Verification Submitted", value: "verification_submitted" },
				{ label: "Verification Approved", value: "verification_approved" },
				{ label: "Verification Rejected", value: "verification_rejected" },
				// payment lifecycle
				{ label: "Payment Initiated", value: "payment_initiated" },
				{ label: "Payment Confirmed", value: "payment_confirmed" },
				{ label: "Payment Failed", value: "payment_failed" },
				{ label: "Payment Expired", value: "payment_expired" },
				// expression of interest lifecycle
				{ label: "Expression of Interest Sent", value: "eoi_sent" },
			],
		},
		{
			// live reference to the account that triggered the event; null for system-initiated events
			name: "actor",
			type: "relationship",
			relationTo: "accounts",
			index: true,
			admin: { readOnly: true },
		},
		{
			// denormalised name + role snapshot so the log remains readable if the
			// actor account is later renamed or deleted
			name: "actorLabel",
			type: "text",
			label: "Actor",
			admin: { readOnly: true },
		},
		{
			// live reference to the account the action was performed on;
			// may be the same as actor for self-service operations
			name: "target",
			type: "relationship",
			relationTo: "accounts",
			index: true,
			admin: { readOnly: true },
		},
		{
			// denormalised name snapshot for the target — same reasoning as actorLabel
			name: "targetLabel",
			type: "text",
			label: "Target",
			admin: { readOnly: true },
		},
		{
			// arbitrary structured context specific to each event type —
			// e.g. rejection reasons, payment amounts, previous field values
			name: "metadata",
			type: "json",
			label: "Metadata",
			admin: {
				readOnly: true,
				description:
					"Structured context for the event — rejection reasons, amounts, etc.",
			},
		},
		{
			// distinguishes deliberate user actions from automated background operations,
			// which matters when investigating incidents or auditing compliance
			name: "source",
			type: "select",
			required: true,
			index: true,
			options: [
				{ label: "User", value: "user" },
				{ label: "System", value: "system" },
			],
			defaultValue: "user",
		},
	],
};

export { AuditLogs };
