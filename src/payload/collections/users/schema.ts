import type { CollectionConfig, FieldHook, TextFieldSingleValidation } from "payload";

import {
	isAdmin,
	isAdminField,
	isAdminOrStaffOrSelfAccountEdit,
	isAdminOrStaff,
	isAdminOrStaffOrSelf,
} from "@/payload/access/access-control";
import {
	createClerkUser,
	deleteClerkUser,
	syncClerkUser,
} from "@/payload/hooks/clerk-sync";
import { clerkStrategy } from "@/payload/strategy/clerk-strategy";

// combines first and last names into a single searchable string. falls back to
// the stored document because partial updates carry only the changed fields
const populateFullName: FieldHook = ({ data, originalDoc }) => {
	const firstName = data?.firstName ?? originalDoc?.firstName ?? "";
	const lastName = data?.lastName ?? originalDoc?.lastName ?? "";
	return `${firstName} ${lastName}`.trim();
};

// password is stripped before persistence, so the stored value is always empty.
// required: true would therefore reject every update, not just creates.
// records arriving with a clerkId came from clerk itself, via the webhook or the
// login strategy, and already have credentials there
const validatePassword: TextFieldSingleValidation = (value, { data, operation }) => {
	const clerkId = (data as { clerkId?: string })?.clerkId;

	if (operation === "create" && !clerkId && !value) {
		return "A password is required when creating a user.";
	}

	return true;
};

const Users: CollectionConfig = {
	slug: "users",
	labels: { singular: "User", plural: "Users" },
	admin: {
		defaultColumns: ["name", "email", "role", "accountState", "createdAt"],
		group: "Globals",
		useAsTitle: "name",
	},
	auth: {
		disableLocalStrategy: true,
		strategies: [clerkStrategy],
	},
	access: {
		admin: isAdminOrStaff,
		create: isAdmin,
		delete: isAdmin,
		// staff see the full list (name + email) for the accounts screens, and may
		// update SaaS accounts (name) but never back-office accounts
		read: isAdminOrStaffOrSelf,
		update: isAdminOrStaffOrSelfAccountEdit,
	},
	fields: [
		{
			name: "clerkId",
			type: "text",
			label: "Clerk ID",
			// populated by the beforeChange hook or by clerk itself; never editable,
			// and only readable by admin — staff get name/email, not clerk internals
			access: { read: isAdminField, update: () => false },
			admin: { hidden: true },
			index: true,
			unique: true,
		},
		{
			name: "email",
			type: "email",
			label: "Email Address",
			// clerk cannot change a primary email through updateUser, so this is
			// set once at creation and locked thereafter
			access: { update: () => false },
			admin: {
				description: "Set once at creation and cannot be changed afterwards.",
			},
			required: true,
		},
		{
			name: "password",
			type: "text",
			// never persisted: the beforeChange hook reads it, passes it to clerk,
			// and strips it from data before the record is written. write-once —
			// nobody edits a password through the users collection after creation
			access: { update: () => false },
			admin: {
				condition: (data) => !data?.id,
				description:
					"Initial password. The user can reset it themselves from the sign-in page.",
			},
			validate: validatePassword,
		},
		{
			type: "row",
			fields: [
				{
					name: "firstName",
					label: "First Name",
					type: "text",
					admin: { width: "50%" },
					required: true,
				},
				{
					name: "lastName",
					label: "Last Name",
					type: "text",
					admin: { width: "50%" },
					required: true,
				},
			],
		},
		{
			name: "role",
			type: "select",
			label: "Role",
			// field-level lock: collection update access allows a user to edit their
			// own record, so without this any user could promote themselves.
			//
			// deliberately has NO defaultValue. there is no neutral role in this
			// project, so a default would silently misfile anyone whose role failed
			// to resolve. the panel forces an explicit choice, and /post-auth
			// re-prompts rather than guessing
			access: { create: isAdminField, update: isAdminField },
			admin: {
				description:
					"Admin and Staff reach the admin panel. Mwajiri and Mjakazi never do.",
			},
			index: true,
			options: [
				{ label: "Admin", value: "admin" },
				{ label: "Staff", value: "staff" },
				{ label: "Mwajiri", value: "mwajiri" },
				{ label: "Mjakazi", value: "mjakazi" },
			],
			required: true,
		},
		{
			name: "accountState",
			type: "select",
			label: "Account State",
			// admin-only at field level. staff may suspend, but they do it through
			// the moderation service with overrideAccess after their own role check,
			// which keeps reinstatement and deletion out of their reach entirely
			access: { create: isAdminField, update: isAdminField },
			admin: {
				description:
					"Suspension and reinstatement are performed from the console, not here.",
				position: "sidebar",
			},
			defaultValue: "active",
			index: true,
			options: [
				{ label: "Active", value: "active" },
				{ label: "Suspended", value: "suspended" },
				{ label: "Deleted", value: "deleted" },
			],
			required: true,
		},
		{
			name: "suspendedAt",
			type: "date",
			label: "Suspended At",
			access: { create: isAdminField, update: isAdminField },
			admin: {
				condition: (data) => data?.accountState === "suspended",
				position: "sidebar",
				readOnly: true,
			},
		},
		{
			name: "suspensionReason",
			type: "textarea",
			label: "Suspension Reason",
			access: { create: isAdminField, update: isAdminField },
			admin: {
				condition: (data) => data?.accountState === "suspended",
				position: "sidebar",
				readOnly: true,
			},
		},
		{
			// derived field for admin display and searchability
			name: "name",
			type: "text",
			label: "Name",
			admin: { position: "sidebar", hidden: true, readOnly: true },
			hooks: { beforeValidate: [populateFullName] },
		},
	],
	hooks: {
		afterChange: [syncClerkUser],
		afterDelete: [deleteClerkUser],
		beforeChange: [createClerkUser],
	},
};

export { Users };
