import { isPublic } from "@/payload/access/access-control";
import { revalidateFooter } from "@/payload/blocks/globals/footer/hooks/revalidate-footer";
import { link } from "@/payload/fields/link";
import type { GlobalConfig } from "payload";

const Footer: GlobalConfig = {
	slug: "footer",
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
			label: "Logo",
			relationTo: "media",
			admin: { position: "sidebar" },
		},
		{
			name: "organizationSlogan",
			type: "text",
			label: "Slogan",
		},
		{
			name: "waajiri",
			type: "group",
			label: "Waajiri Column",
			fields: [
				{ name: "waajiriHeader", type: "text", label: "Header" },
				{
					name: "mwajiriItems",
					type: "array",
					label: "Mwajiri Items",
					labels: { singular: "Mwajiri Link", plural: "Mwajiri Links" },
					fields: [link({ appearances: false })],
					maxRows: 3,
					admin: {
						components: {
							RowLabel: "@/payload/blocks/globals/footer/row-label#RowLabel",
						},
						initCollapsed: true,
					},
				},
			],
		},
		{
			name: "wajakazi",
			type: "group",
			label: "Wajakazi Column",
			fields: [
				{ name: "wajakaziHeader", type: "text", label: "Header" },
				{
					name: "wajakaziItems",
					type: "array",
					label: "Wajakazi Items",
					labels: { singular: "Wajakazi Link", plural: "Wajakazi Links" },
					fields: [link({ appearances: false })],
					maxRows: 3,
					admin: {
						components: {
							RowLabel: "@/payload/blocks/globals/footer/row-label#RowLabel",
						},
						initCollapsed: true,
					},
				},
			],
		},
		{
			name: "legal",
			type: "group",
			label: "Legal Column",
			fields: [
				{ name: "legalHeader", type: "text", label: "Header" },
				{
					name: "legalItems",
					type: "array",
					label: "Legal Items",
					labels: { singular: "Legal Link", plural: "Legal Links" },
					fields: [link({ appearances: false })],
					maxRows: 3,
					admin: {
						components: {
							RowLabel: "@/payload/blocks/globals/footer/row-label#RowLabel",
						},
						initCollapsed: true,
					},
				},
			],
		},
		{
			name: "copyright",
			type: "text",
			label: "Copyright Notice",
			required: true,
		},
	],
	hooks: { afterChange: [revalidateFooter] },
};

export { Footer };
