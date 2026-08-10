import { isAuthenticated } from "@/payload/access/access-control";
import type { CollectionConfig, FieldHook } from "payload";

// combines first and last names into a single searchable string
const populateFullName: FieldHook = async ({ data }) => {
	return `${data?.firstName} ${data?.lastName}`;
};

// core collection for administrators and internal system users
const Users: CollectionConfig = {
	slug: "users",
	access: {
		// restricted to authenticated users to ensure secure admin access
		admin: isAuthenticated,
		create: isAuthenticated,
		delete: isAuthenticated,
		read: isAuthenticated,
		update: isAuthenticated,
	},
	admin: {
		defaultColumns: ["name", "photo", "email", "createdAt", "updatedAt"],
		group: "Content",
		useAsTitle: "name",
	},
	labels: { singular: "User", plural: "Users" },
	// enables native payload authentication for this collection
	auth: true,
	fields: [
		{
			type: "row",
			fields: [
				{
					name: "firstName",
					type: "text",
					label: "First Name",
					required: true,
					admin: { width: "50%" },
				},
				{
					name: "lastName",
					type: "text",
					label: "Last Name",
					required: true,
					admin: { width: "50%" },
				},
			],
		},
		{
			// derived field for admin display and searchability
			name: "name",
			type: "text",
			label: "Name",
			admin: { position: "sidebar", hidden: true, readOnly: true },
			hooks: { beforeValidate: [populateFullName] },
		},
		{
			// optional avatar image linked to the media collection
			name: "photo",
			type: "upload",
			label: "Photo",
			relationTo: "media",
			admin: { position: "sidebar" },
		},
	],
};

export { Users };
