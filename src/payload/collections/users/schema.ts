import {
	isAdmin,
	isAdminField,
	isAdminOrEditor,
	isAdminOrSelf,
} from "@/payload/access/access-control";
import {
	createClerkUser,
	deleteClerkUser,
	syncClerkUser,
} from "@/payload/hooks/clerk-sync";
import { clerkStrategy } from "@/payload/strategy/clerk-strategy";
import type { CollectionConfig, FieldHook, TextFieldSingleValidation } from "payload";

// combines first and last names into a single searchable string
const populateFullName: FieldHook = async ({ data }) => {
	return `${data?.firstName} ${data?.lastName}`;
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
		defaultColumns: ["name", "email", "role", "createdAt", "updatedAt"],
		group: "Globals",
		useAsTitle: "name",
	},
	auth: {
		disableLocalStrategy: true,
		strategies: [clerkStrategy],
	},
	access: {
		admin: isAdminOrEditor,
		create: isAdmin,
		delete: isAdmin,
		read: isAdminOrSelf,
		update: isAdminOrSelf,
	},
	fields: [
		{
			name: "clerkId",
			type: "text",
			label: "Clerk ID",
			// populated by the beforeChange hook or by clerk itself; never editable
			access: { update: () => false },
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
			required: true,
		},
		{
			name: "password",
			type: "text",
			// never persisted: the beforeChange hook reads it, passes it to clerk,
			// and strips it from data before the record is written
			admin: { condition: (data) => !data?.id },
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
			// own record, so without this any user could promote themselves
			access: { create: isAdminField, update: isAdminField },
			defaultValue: "user",
			options: [
				{ label: "Admin", value: "admin" },
				{ label: "Editor", value: "editor" },
				{ label: "User", value: "user" },
			],
			required: true,
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
