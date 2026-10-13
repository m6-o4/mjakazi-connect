import type { CollectionConfig } from "payload";

import { JOB_OPTIONS } from "@/lib/profile-constants";
import { REFERRAL_NOTE_MAX_LENGTH } from "@/lib/referral";
import { isAdminOrStaff, isRestricted } from "@/payload/access/access-control";

// an off-platform referral: a vouch a mjakazi invites a *former employer* to
// give about a relationship that predates the platform. the referrer has no
// account and no subscription — the single-use invite token is the whole
// capability, and this collection is sealed so every write goes through
// referral.service. reads are service-owned for the two SaaS surfaces, so
// collection read is staff/admin only for the panel.
const Referrals: CollectionConfig = {
	slug: "referrals",
	labels: { singular: "Referral", plural: "Referrals" },
	admin: {
		useAsTitle: "referrerName",
		defaultColumns: ["referrerName", "mjakazi", "state", "createdAt"],
		group: "SaaS",
	},
	access: {
		create: isRestricted,
		read: isAdminOrStaff,
		update: isRestricted,
		delete: isRestricted,
	},
	fields: [
		{
			name: "mjakazi",
			type: "relationship",
			relationTo: "wajakazi-profiles",
			label: "Mjakazi",
			required: true,
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "referrerName",
			type: "text",
			label: "Referrer Name",
			required: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			// the former employer's contact. personal data of a third party who
			// never created an account — never public, never logged, never in a
			// public response. the invite link is sent here and no account is made
			name: "referrerEmail",
			type: "email",
			label: "Referrer Email",
			required: true,
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "role",
			type: "select",
			label: "Role",
			required: true,
			options: JOB_OPTIONS.map((option) => ({
				label: option.label,
				value: option.value,
			})),
			admin: { readOnly: true },
		},
		{
			name: "startDate",
			type: "date",
			label: "Employment Start",
			required: true,
			admin: { readOnly: true },
		},
		{
			name: "endDate",
			type: "date",
			label: "Employment End",
			required: true,
			admin: { readOnly: true },
		},
		{
			// written by the referrer on submit. optional in the schema because the
			// record is created at invite time, before the note exists; the service
			// requires it on submission
			name: "note",
			type: "textarea",
			label: "Referral Note",
			maxLength: REFERRAL_NOTE_MAX_LENGTH,
			admin: { readOnly: true },
		},
		{
			name: "state",
			type: "select",
			label: "State",
			required: true,
			defaultValue: "invited",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
			options: [
				{ label: "Invited", value: "invited" },
				{ label: "Pending Review", value: "pending" },
				{ label: "Published", value: "published" },
				{ label: "Rejected", value: "rejected" },
				{ label: "Withdrawn", value: "withdrawn" },
				{ label: "Expired", value: "expired" },
			],
		},
		{
			// `<mjakazi>:<hash(referrer email)>` while an invite is outstanding,
			// pending or published, uniquified on withdrawal, rejection or expiry.
			// the unique index enforces one live referral per (mjakazi, employer) —
			// a concurrent duplicate invite fails here instead of creating a second.
			// the email is hashed so the key never carries a raw address
			name: "activeKey",
			type: "text",
			label: "Active Key",
			unique: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			// sha-256 of the invite token. the raw token lives only in the emailed
			// link, so a database read cannot be turned into a usable invite
			name: "inviteTokenHash",
			type: "text",
			label: "Invite Token Hash",
			index: true,
			admin: { hidden: true },
		},
		{
			name: "inviteExpiresAt",
			type: "date",
			label: "Invite Expires At",
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "invitedAt",
			type: "date",
			label: "Invited At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "submittedAt",
			type: "date",
			label: "Submitted At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "publishedAt",
			type: "date",
			label: "Published At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "rejectedAt",
			type: "date",
			label: "Rejected At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "withdrawnAt",
			type: "date",
			label: "Withdrawn At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "expiredAt",
			type: "date",
			label: "Expired At",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "rejectionReason",
			type: "text",
			label: "Rejection Reason",
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			// the staff or admin member who published or rejected this referral
			name: "reviewedBy",
			type: "relationship",
			relationTo: "users",
			label: "Reviewed By",
			admin: { readOnly: true, position: "sidebar" },
		},
	],
	indexes: [{ fields: ["mjakazi", "state"] }],
	timestamps: true,
};

export { Referrals };
