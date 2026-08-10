import { isPublic } from "@/payload/access/access-control";
import { revalidateHeader } from "@/payload/blocks/globals/header/hooks/revalidate-header";
import { link } from "@/payload/fields/link";
import type { GlobalConfig } from "payload";

// defines the content structure for the site-wide header including branding and links
const Header: GlobalConfig = {
	slug: "header",
	// allows public read access so the header can be rendered on the website
	access: { read: isPublic },
	fields: [
		{
			name: "organizationName",
			type: "text",
			label: "Organization Name",
			required: true,
		},
		{
			name: "organizationLogo",
			type: "upload",
			label: "Organization Logo",
			relationTo: "media",
			required: true,
			// places the logo field in the sidebar to keep the main editor focused on navigation
			admin: { position: "sidebar" },
		},
		{
			name: "navigationItems",
			type: "array",
			label: "Navigation Items",
			labels: { singular: "Navigation Item", plural: "Navigation Items" },
			fields: [link({ appearances: false })],
			// limits the number of items to prevent design breakage on smaller viewports
			maxRows: 3,
			admin: {
				// provides contextual row labels for better identification in the admin ui
				components: { RowLabel: "@/payload/blocks/globals/header/row-label#RowLabel" },
				initCollapsed: true,
			},
		},
		{
			name: "authorization",
			type: "group",
			label: "Authorization",
			fields: [link({ appearances: false })],
		},
		{
			name: "register",
			type: "group",
			label: "Register",
			fields: [link({ appearances: false })],
		},
	],
	// triggers cache revalidation to ensure frontend updates reflect CMS changes immediately
	hooks: { afterChange: [revalidateHeader] },
};

export { Header };
