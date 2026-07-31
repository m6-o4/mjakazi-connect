import type { GlobalConfig } from "payload";

const Branding: GlobalConfig = {
	slug: "branding",
	fields: [
		{
			type: "row",
			fields: [
				{
					name: "organizationIcon",
					label: "Organization Icon",
					type: "upload",
					required: true,
					relationTo: "media",
				},
			],
		},
	],
};

export { Branding };
