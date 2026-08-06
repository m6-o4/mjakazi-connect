import type { Block } from "payload";

const CallToAction: Block = {
	slug: "callToAction",
	interfaceName: "CallToAction",
	labels: {
		singular: "Call to Action Block",
		plural: "Calls to Action Block",
	},
	fields: [
		{
			name: "calltoaction",
			type: "relationship",
			label: "Call to Action",
			relationTo: "callstoaction",
			hasMany: false,
			required: true,
		},
	],
};

export { CallToAction };
