import type { Block } from "payload";

const Registration: Block = {
	slug: "registration",
	interfaceName: "Registration",
	labels: { singular: "Registration Block", plural: "Registration Blocks" },
	fields: [
		{
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
			name: "mwajiriCard",
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
			name: "backgroundVariant",
			type: "select",
			label: "Background Style",
			defaultValue: "background",
			options: [
				{ label: "Muted", value: "muted" },
				{ label: "Background", value: "background" },
			],
			required: true,
		},
	],
};

export { Registration };
