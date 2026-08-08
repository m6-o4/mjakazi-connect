import type { CollectionConfig } from "payload";

import { isAdminOrStaff, isPublic } from "@/payload/access/access-control";
import { link } from "@/payload/fields/link";

const CallsToAction: CollectionConfig = {
	slug: "callstoaction",
	labels: { singular: "Call to Action", plural: "Calls to Action" },
	admin: {
		defaultColumns: ["headline", "headlineDescription", "createdAt", "updatedAt"],
		group: "Content",
		useAsTitle: "headline",
	},
	access: {
		create: isAdminOrStaff,
		delete: isAdminOrStaff,
		read: isPublic,
		update: isAdminOrStaff,
	},
	fields: [
		{ name: "headline", type: "text", label: "Headline", required: true },
		{
			name: "headlineDescription",
			type: "text",
			label: "Headline Description",
			required: true,
		},
		{
			name: "ctaRegister",
			type: "group",
			label: "Registration",
			fields: [link({ appearances: false })],
		},
		{
			name: "ctaDirectory",
			type: "group",
			label: "Browse Directory",
			fields: [link({ appearances: false })],
		},
	],
};

export { CallsToAction };
