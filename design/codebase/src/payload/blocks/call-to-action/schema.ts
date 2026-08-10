import type { Block } from "payload";

// defines the call to action block for use in layout builders
const CallToAction: Block = {
	slug: "callToAction",
	interfaceName: "CallToAction",
	labels: {
		singular: "Call to Action Block",
		plural: "Calls to Action Block",
	},
	fields: [
		{
			// references the centralized calls to action collection to ensure content consistency
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
