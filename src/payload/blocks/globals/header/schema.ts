import { isPublic } from "@/payload/access/access-control";
import { revalidateHeader } from "@/payload/blocks/globals/header/hooks/revalidate-header";
import { link } from "@/payload/fields/link";
import type { GlobalConfig } from "payload";

const Header: GlobalConfig = {
	slug: "header",
	access: { read: isPublic },
	fields: [
		{
			name: "organizationName",
			type: "text",
			label: "Organization Name",
		},
		{
			name: "organizationLogo",
			type: "upload",
			label: "Organization Logo",
			relationTo: "media",
			admin: { position: "sidebar" },
		},
		{
			name: "navigationItems",
			type: "array",
			label: "Navigation Items",
			labels: { singular: "Navigation Item", plural: "Navigation Items" },
			fields: [link({ appearances: false })],
			maxRows: 3,
			admin: {
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
	hooks: { afterChange: [revalidateHeader] },
};

export { Header };
