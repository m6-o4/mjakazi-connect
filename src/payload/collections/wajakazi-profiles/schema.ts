import type { CollectionConfig } from "payload";

import {
	COUNTRY_OPTIONS,
	EDUCATION_LEVEL_OPTIONS,
	JOB_OPTIONS,
	LANGUAGE_OPTIONS,
	LOCATION_OPTIONS,
	MARITAL_STATUS_OPTIONS,
	RELIGION_OPTIONS,
	WORK_PREFERENCE_OPTIONS,
} from "@/lib/profile-constants";
import {
	isAdmin,
	isAdminOrOwner,
	isAdminOrStaffField,
	isDirectoryVisibleOrOwner,
} from "@/payload/access/access-control";

// 1:1 profile for a mjakazi user. the single record everything downstream hangs
// off — verification state, documents, the directory listing, expressions of
// interest. created by identity.service.ts, never by the user directly.
const WajakaziProfiles: CollectionConfig = {
	slug: "wajakazi-profiles",
	labels: { singular: "Mjakazi Profile", plural: "Mjakazi Profiles" },
	admin: {
		useAsTitle: "displayName",
		defaultColumns: ["user", "verificationState", "availabilityStatus", "updatedAt"],
		group: "SaaS",
	},
	access: {
		create: isAdmin,
		read: isDirectoryVisibleOrOwner,
		update: isAdminOrOwner("user"),
		delete: isAdmin,
	},
	fields: [
		{
			name: "user",
			type: "relationship",
			relationTo: "users",
			label: "User",
			required: true,
			unique: true,
			// the profile is 1:1 with the user record — never re-pointed after creation
			access: { update: () => false },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "displayName",
			type: "text",
			label: "Display Name",
			required: true,
		},
		// --- identity ---
		{
			name: "legalFirstName",
			type: "text",
			label: "Legal First Name",
		},
		{
			name: "legalLastName",
			type: "text",
			label: "Legal Last Name",
		},
		{
			name: "dateOfBirth",
			type: "date",
			label: "Date of Birth",
		},
		{
			name: "nationality",
			type: "select",
			label: "Nationality",
			options: COUNTRY_OPTIONS.map((c) => ({ label: c.label, value: c.value })),
		},
		{
			name: "maritalStatus",
			type: "select",
			label: "Marital Status",
			options: MARITAL_STATUS_OPTIONS.map((m) => ({ label: m.label, value: m.value })),
		},
		{
			name: "religion",
			type: "select",
			label: "Religion",
			options: RELIGION_OPTIONS.map((r) => ({ label: r.label, value: r.value })),
		},
		{
			name: "phone",
			type: "text",
			label: "Mobile Phone Number",
		},
		{
			name: "photo",
			type: "upload",
			relationTo: "profile-photos",
			label: "Profile Photo",
		},
		// --- professional ---
		{
			name: "jobsSkills",
			type: "select",
			label: "Jobs / Skills",
			hasMany: true,
			index: true,
			options: JOB_OPTIONS.map((j) => ({ label: j.label, value: j.value })),
		},
		{
			name: "about",
			type: "textarea",
			label: "About Me",
		},
		{
			name: "yearsExperience",
			type: "number",
			label: "Years of Experience",
			min: 0,
		},
		{
			name: "educationLevel",
			type: "select",
			label: "Education Level",
			options: EDUCATION_LEVEL_OPTIONS.map((e) => ({ label: e.label, value: e.value })),
		},
		{
			name: "languages",
			type: "select",
			label: "Languages Spoken",
			hasMany: true,
			options: LANGUAGE_OPTIONS.map((l) => ({ label: l.label, value: l.value })),
		},
		{
			name: "workPreference",
			type: "select",
			label: "Work Preference",
			options: WORK_PREFERENCE_OPTIONS.map((w) => ({ label: w.label, value: w.value })),
		},
		{
			name: "availableFrom",
			type: "date",
			label: "Available From",
		},
		{
			name: "salaryMin",
			type: "number",
			label: "Minimum Expected Salary (KSh)",
			min: 0,
		},
		{
			name: "salaryMax",
			type: "number",
			label: "Maximum Expected Salary (KSh)",
			min: 0,
		},
		{
			name: "location",
			type: "select",
			label: "Location",
			index: true,
			options: LOCATION_OPTIONS.map((l) => ({ label: l.label, value: l.value })),
		},
		{
			name: "verificationState",
			type: "select",
			label: "Verification State",
			required: true,
			defaultValue: "draft",
			index: true,
			// staff/admin drive this through the verification service. a mjakazi must
			// never set their own verification state, so it is locked at field level
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: {
				description:
					"Managed by staff through the verification flow — a mjakazi never sets this directly.",
				position: "sidebar",
			},
			options: [
				{ label: "Draft", value: "draft" },
				{ label: "Pending Payment", value: "pending_payment" },
				{ label: "Pending Review", value: "pending_review" },
				{ label: "Verified", value: "verified" },
				{ label: "Rejected", value: "rejected" },
				{ label: "Verification Expired", value: "verification_expired" },
				{ label: "Blacklisted", value: "blacklisted" },
				{ label: "Deactivated", value: "deactivated" },
			],
		},
		{
			name: "availabilityStatus",
			type: "select",
			label: "Availability",
			required: true,
			defaultValue: "available",
			options: [
				{ label: "Available", value: "available" },
				{ label: "Hired", value: "hired" },
				{ label: "On a Break", value: "on_break" },
			],
		},
		{
			name: "profileComplete",
			type: "checkbox",
			label: "Profile Complete",
			defaultValue: false,
			// computed by the profile service, never set by the user directly
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
		// --- verification bookkeeping (service-managed, staff/admin only) ---
		// every field below is written by the verification service, never by a
		// mjakazi directly — a mjakazi can only ever trigger a transition through
		// the service, which is why these are field-locked to staff/admin
		{
			name: "verificationSubmittedAt",
			type: "date",
			label: "Verification Submitted At",
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "verificationReviewedAt",
			type: "date",
			label: "Verification Reviewed At",
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "verificationExpiry",
			type: "date",
			label: "Verification Expiry",
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "verificationAttempts",
			type: "number",
			label: "Verification Attempts",
			defaultValue: 0,
			min: 0,
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "lastVerificationPaymentId",
			type: "text",
			label: "Last Verification Payment ID",
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "blacklistedAt",
			type: "date",
			label: "Blacklisted At",
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "deactivatedAt",
			type: "date",
			label: "Deactivated At",
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "rejectionReason",
			type: "textarea",
			label: "Rejection Reason",
			access: { create: isAdminOrStaffField, update: isAdminOrStaffField },
			admin: { readOnly: true },
		},
	],
	timestamps: true,
};

export { WajakaziProfiles };
