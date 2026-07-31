import type { Block } from "payload";

const Code: Block = {
	slug: "code",
	interfaceName: "CodeBlock",
	labels: { singular: "Code Block", plural: "Code Blocks" },
	fields: [
		{
			name: "language",
			type: "select",
			defaultValue: "typescript",
			options: [
				{ label: "Typescript", value: "typescript" },
				{ label: "Javascript", value: "javascript" },
				{ label: "CSS", value: "css" },
			],
		},
		{ name: "code", type: "code", label: false, required: true },
	],
};

export { Code };
