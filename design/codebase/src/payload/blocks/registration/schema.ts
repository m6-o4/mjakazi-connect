import { link } from "@/payload/fields/link";
import type { Block } from "payload";

// defines the configuration for a dual-card registration block
const Registration: Block = {
	slug: "registration",
	interfaceName: "Registration",
	labels: { singular: "Registration Block", plural: "Registration Blocks" },
	fields: [
		{
			// captures details for the mjakazi (worker) registration path
			name: "mjakaziCard",
			type: "group",
			label: "Mjakazi Card",
			fields: [
				{
					name: "image",
					type: "upload",
					label: "Image",
					relationTo: "media",
					required: true,
				},
				{
					name: "title",
					type: "text",
					label: "Title",
					required: true,
				},
				{
					name: "description",
					type: "textarea",
					label: "Description",
					required: true,
				},
				{
					type: "row",
					fields: [
						{
							name: "buttonLink",
							type: "text",
							label: "Button Link",
							required: true,
							defaultValue: "/sign-up?role=mjakazi",
							admin: { width: "50%" },
						},
						{
							name: "buttonText",
							type: "text",
							label: "Button Text",
							required: true,
							admin: { width: "50%" },
						},
					],
				},
			],
		},
		{
			// captures details for the mwajiri (employer) registration path
			name: "mwaajiriCard",
			type: "group",
			label: "Mwajiri Card",
			fields: [
				{
					name: "image",
					type: "upload",
					label: "Image",
					relationTo: "media",
					required: true,
				},
				{
					name: "title",
					type: "text",
					label: "Title",
					required: true,
				},
				{
					name: "description",
					type: "textarea",
					label: "Description",
					required: true,
				},
				{
					type: "row",
					fields: [
						{
							name: "buttonLink",
							type: "text",
							label: "Button Link",
							required: true,
							defaultValue: "/sign-up?role=mwajiri",
							admin: {
								width: "50%",
							},
						},
						{
							name: "buttonText",
							type: "text",
							label: "Button Text",
							required: true,
							admin: {
								width: "50%",
							},
						},
					],
				},
			],
		},
		// allows editors to toggle between background colors for visual sectioning
		{
			name: "backgroundVariant",
			type: "select",
			label: "Background Style",
			defaultValue: "subtle",
			options: [
				{ label: "Subtle", value: "subtle" },
				{ label: "White", value: "white" },
			],
			required: true,
		},
	],
};

export { Registration };
