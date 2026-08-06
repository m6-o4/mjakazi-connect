import type { Block } from "payload";

const Testimonials: Block = {
	slug: "testimonials",
	interfaceName: "Testimonials",
	labels: { singular: "Testimonials Block", plural: "Testimonials Blocks" },
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
			name: "testimonies",
			type: "array",
			fields: [
				{
					type: "row",
					fields: [
						{
							name: "name",
							type: "text",
							label: "Name",
							required: true,
							admin: { width: "50%" },
						},
						{
							name: "occupation",
							type: "text",
							label: "Occupation",
							required: true,
							admin: { width: "25%" },
						},
						{
							name: "location",
							type: "text",
							label: "Residential Location",
							required: true,
							admin: { width: "25%" },
						},
					],
				},
				{
					name: "rating",
					type: "number",
					label: "Rating",
					required: true,
					defaultValue: 5,
					min: 1,
					max: 5,
				},
				{
					name: "testimony",
					type: "textarea",
					label: "Testimony",
					required: true,
				},
			],
			maxRows: 3,
			admin: { initCollapsed: true },
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

export { Testimonials };
