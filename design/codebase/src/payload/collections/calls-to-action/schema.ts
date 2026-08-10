import { isAuthenticated, isPublic } from "@/payload/access/access-control";
import { link } from "@/payload/fields/link";
import type { CollectionConfig } from "payload";

// defines a collection for reusable call to action items
const CallsToAction: CollectionConfig = {
	slug: "callstoaction",
	access: {
		// restricts management to authenticated users while allowing public read access
		create: isAuthenticated,
		delete: isAuthenticated,
		read: isPublic,
		update: isAuthenticated,
	},
	admin: {
		defaultColumns: ["headline", "createdAt", "updatedAt"],
		group: "Content",
		useAsTitle: "headline",
	},
	labels: { singular: "Call to Action", plural: "Calls to Action" },
	fields: [
		{
			name: "headline",
			type: "text",
			label: "Headline",
			required: true,
		},
		{
			name: "headlineDescription",
			type: "text",
			label: "Headline Description",
			required: true,
		},
		{
			// primary action for user registration
			name: "ctaRegister",
			type: "group",
			label: "Registration",
			fields: [link({ appearances: false })],
		},
		{
			// secondary action for exploring the directory
			name: "ctaDirectory",
			type: "group",
			label: "Browse Directory",
			fields: [link({ appearances: false })],
		},
	],
};

export { CallsToAction };
