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
import { isAdminOrProfileOwner, isRestricted } from "@/payload/access/access-control";
import { revalidateMjakazi } from "@/payload/collections/wajakazi-profiles/hooks/revalidate-mjakazi";
import type { CollectionConfig } from "payload";

// payload collection definition for worker profiles
const WajakaziProfiles: CollectionConfig = {
	slug: "wajakaziprofiles",
	// restrict data access to admins or the owner of the profile
	access: {
		create: isRestricted,
		update: isRestricted,
		delete: isRestricted,
		read: isAdminOrProfileOwner,
	},
	admin: {
		useAsTitle: "displayName",
		defaultColumns: [
			"displayName",
			"verificationStatus",
			"profileComplete",
			"createdAt",
			"updatedAt",
		],
		group: "SaaS",
	},
	labels: { singular: "Mjakazi Profile", plural: "Wajakazi Profiles" },
	fields: [
		// --- identity ---
		// link profile to a specific user account
		{
			name: "account",
			type: "relationship",
			label: "Account",
			relationTo: "accounts",
			required: true,
			unique: true,
			index: true,
		},
		{
			name: "displayName",
			type: "text",
			label: "Display Name",
			required: true,
			index: true,
		},
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
			options: COUNTRY_OPTIONS.map((c) => ({
				label: c.label,
				value: c.value,
			})),
		},
		{
			name: "maritalStatus",
			type: "select",
			label: "Marital Status",
			options: MARITAL_STATUS_OPTIONS.map((m) => ({
				label: m.label,
				value: m.value,
			})),
		},
		{
			name: "religion",
			type: "select",
			label: "Religion",
			options: RELIGION_OPTIONS.map((r) => ({
				label: r.label,
				value: r.value,
			})),
		},

		// --- contact ---
		{
			name: "phoneNumber",
			type: "text",
			label: "Mobile Phone Number",
		},

		// --- photo ---
		{
			name: "photo",
			type: "upload",
			label: "Profile Photo",
			relationTo: "media",
		},

		// --- professional ---
		{
			name: "jobs",
			type: "select",
			label: "Jobs / Skills",
			hasMany: true,
			index: true,
			options: JOB_OPTIONS.map((j) => ({
				label: j.label,
				value: j.value,
			})),
		},
		{
			name: "bio",
			type: "textarea",
			label: "About Me",
		},
		{
			name: "experience",
			type: "number",
			label: "Years of Experience",
			min: 0,
		},
		{
			name: "educationLevel",
			type: "select",
			label: "Education Level",
			options: EDUCATION_LEVEL_OPTIONS.map((e) => ({
				label: e.label,
				value: e.value,
			})),
		},
		{
			name: "languages",
			type: "select",
			label: "Languages Spoken",
			hasMany: true,
			options: LANGUAGE_OPTIONS.map((l) => ({
				label: l.label,
				value: l.value,
			})),
		},

		// --- work preferences ---
		{
			name: "workPreference",
			type: "select",
			label: "Work Preference",
			options: WORK_PREFERENCE_OPTIONS.map((w) => ({
				label: w.label,
				value: w.value,
			})),
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
			options: LOCATION_OPTIONS.map((l) => ({
				label: l.label,
				value: l.value,
			})),
		},

		// --- availability ---
		{
			name: "availabilityStatus",
			type: "select",
			label: "Availability Status",
			required: true,
			index: true,
			options: [
				{ label: "Available", value: "available" },
				{ label: "Hired", value: "hired" },
				{ label: "On Break", value: "on_break" },
			],
			defaultValue: "available",
		},

		// --- verification ---
		{
			name: "verificationStatus",
			type: "select",
			label: "Verification Status",
			required: true,
			index: true,
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
			defaultValue: "draft",
		},
		{
			name: "verificationSubmittedAt",
			type: "date",
			label: "Verification Submitted At",
			admin: { readOnly: true },
		},
		{
			name: "verificationReviewedAt",
			type: "date",
			label: "Verification Reviewed At",
			admin: { readOnly: true },
		},
		{
			name: "verificationExpiry",
			type: "date",
			label: "Verification Expiry",
		},
		{
			name: "verificationAttempts",
			type: "number",
			label: "Verification Attempts",
			defaultValue: 0,
			admin: { readOnly: true },
		},
		{
			name: "rejectionReason",
			type: "textarea",
			label: "Rejection Reason",
		},
		{
			name: "blacklistedAt",
			type: "date",
			label: "Blacklisted At",
			admin: { readOnly: true },
		},
		{
			name: "deactivatedAt",
			type: "date",
			label: "Deactivated At",
			admin: { readOnly: true },
		},
		{
			name: "verificationNotes",
			type: "textarea",
			label: "Verification Notes",
			admin: { description: "Internal moderation notes." },
		},
		{
			name: "documents",
			type: "relationship",
			label: "Verification Documents",
			relationTo: "vault",
			hasMany: true,
		},

		// --- profile completeness ---
		// tracks whether profile meets minimum requirements for display
		{
			name: "profileComplete",
			type: "checkbox",
			label: "Profile Complete",
			defaultValue: false,
			admin: {
				readOnly: true,
				description: "Set automatically when all required profile fields are populated.",
			},
		},
	],

	hooks: { afterChange: [revalidateMjakazi] },
};

export { WajakaziProfiles };
