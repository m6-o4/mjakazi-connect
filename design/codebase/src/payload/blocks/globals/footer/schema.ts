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
			required: true,
		},
		{
			name: "organizationLogo",
			type: "upload",
			label: "Logo",
			relationTo: "media",
			required: true,
			// places the logo field in the sidebar to keep the main editor focused on navigation
			admin: { position: "sidebar" },
		},
		{
			// the organization's slogan or tagline, mandatory.
			name: "organizationSlogan",
			type: "text",
			label: "Slogan",
			required: true,
		},
		{
			// groups fields for the 'waajiri' navigation column.
			name: "waajiri",
			type: "group",
			label: "Waajiri Column",
			fields: [
				{
					// header text for the waajiri column.
					name: "waajiriHeader",
					type: "text",
					label: "Header",
				},
				{
					// array of links for waajiri.
					name: "mwaajiriItems",
					type: "array",
					label: "Mwajiri Items",
					labels: { singular: "Mwajiri Link", plural: "Mwajiri Links" },
					fields: [link({ appearances: false })],
					// maximum of 3 mwajiri links.
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
			// groups fields for the 'wajakazi' navigation column.
			name: "wajakazi",
			type: "group",
			label: "Wajakazi Column",
			fields: [
				{
					// header text for the wajakazi column.
					name: "wajakaziHeader",
					type: "text",
					label: "Header",
				},
				{
					// array of links for wajakazi-related pages.
					name: "wajakaziItems",
					type: "array",
					label: "Wajakazi Items",
					labels: { singular: "Wajakazi Link", plural: "Wajakazi Links" },
					fields: [link({ appearances: false })],
					// maximum of 3 wajakazi links.
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
			// groups fields for the 'legal' navigation column.
			name: "legal",
			type: "group",
			label: "Legal Column",
			fields: [
				{
					// header text for the legal column.
					name: "legalHeader",
					type: "text",
					label: "Header",
				},
				{
					// array of links for legal pages (e.g., privacy, terms).
					name: "legalItems",
					type: "array",
					label: "Legal Items",
					labels: { singular: "Legal Link", plural: "Legal Links" },
					fields: [link({ appearances: false })],
					// maximum of 3 legal links.
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
			// the main copyright text to display at the bottom of the footer, mandatory.
			name: "copyright",
			type: "text",
			label: "Copyright Notice",
			required: true,
		},
	],
	hooks: {
		// triggers next.js cache revalidation for the entire site after any change to the footer.
		afterChange: [revalidateFooter],
	},
};

export { Footer };
