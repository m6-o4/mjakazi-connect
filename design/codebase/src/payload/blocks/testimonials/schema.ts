import type { Block } from "payload";

// defines a reusable layout block for showcasing selected client testimonials on any page
const Testimonials: Block = {
	slug: "testimonials",
	interfaceName: "Testimonials",
	labels: { singular: "Testimonials Block", plural: "Testimonials Blocks" },
	fields: [
		{
			// main title to introduce the testimonials section
			name: "headline",
			type: "text",
			label: "Headline",
			required: true,
		},
		{
			// optional subtext to provide additional context or branding
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
		// allows editors to toggle between light and muted background styles
		{
			name: "backgroundVariant",
			type: "select",
			label: "Background Style",
			defaultValue: "white",
			options: [
				{ label: "Subtle", value: "subtle" },
				{ label: "White", value: "white" },
			],
			required: true,
		},
	],
};

export { Testimonials };
