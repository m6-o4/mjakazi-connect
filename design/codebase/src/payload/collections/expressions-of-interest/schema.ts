import { isAdminOrSA, isRestricted } from "@/payload/access/access-control";
import type { CollectionConfig } from "payload";

const ExpressionsOfInterest: CollectionConfig = {
	slug: "expressions-of-interest",
	access: {
		// restrict access to specific user roles, allowing read for admins only
		create: isRestricted,
		update: isRestricted,
		delete: isRestricted,
		read: isAdminOrSA,
	},
	admin: {
		// configure admin interface display settings
		useAsTitle: "id",
		defaultColumns: [
			"mwajiriAccount",
			"wajakaziProfile",
			"status",
			"createdAt",
			"updatedAt",
		],
		group: "SaaS",
	},
	labels: {
		// set singular and plural labels for the collection
		singular: "Expression of Interest",
		plural: "Expressions of Interest",
	},
	fields: [
		// define the schema fields for the collection
		{
			name: "mwajiriAccount",
			type: "relationship",
			label: "Mwajiri Account",
			relationTo: "accounts",
			required: true,
			index: true,
		},
		{
			name: "wajakaziProfile",
			type: "relationship",
			label: "Mjakazi Profile",
			relationTo: "wajakaziprofiles",
			required: true,
			index: true,
		},
		{
			// denormalized fields for quick display without database joins
			name: "mwajiriDisplayName",
			type: "text",
			label: "Mwajiri Display Name",
		},
		{
			name: "mwajiriOrganization",
			type: "text",
			label: "Mwajiri Organization",
		},
		{
			name: "mwajiriEmail",
			type: "email",
			label: "Mwajiri Email",
		},
		{
			// track the current state of the response
			name: "status",
			type: "select",
			label: "Status",
			required: true,
			index: true,
			options: [
				{ label: "Pending", value: "pending" },
				{ label: "Interested", value: "interested" },
				{ label: "Not Interested", value: "not_interested" },
			],
			defaultValue: "pending",
		},
		{
			// flag to prevent duplicate notification triggers
			name: "notificationSent",
			type: "checkbox",
			label: "Notification Sent",
			defaultValue: false,
			admin: { readOnly: true },
		},
	],
};

export { ExpressionsOfInterest };
