import { isAdminOrEditor, isPublic } from "@/payload/access/access-control";
import { link } from "@/payload/fields/link";
import type { CollectionConfig } from "payload";

const CallsToAction: CollectionConfig = {
	slug: "callstoaction",
	labels: { singular: "Call to Action", plural: "Calls to Action" },
	admin: {
		defaultColumns: ["headline", "headlineDescription", "createdAt", "updatedAt"],
		group: "Content",
		useAsTitle: "headline",
	},
	access: {
		create: isAdminOrEditor,
		delete: isAdminOrEditor,
		read: isPublic,
		update: isAdminOrEditor,
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
