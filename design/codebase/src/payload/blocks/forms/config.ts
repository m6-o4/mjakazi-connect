import type { Field } from "payload";

// defines the internal system name for the field
const name: Field = {
	name: "name",
	type: "text",
	// label guides users to use a clean, machine-friendly name
	label: "Name (lowercase, no special characters)",
	required: true,
	admin: { width: "50%" },
};

// defines the user-facing display label for the field
const label: Field = {
	name: "label",
	type: "text",
	label: "Label",
	admin: { width: "50%" },
};

// determines if a value is mandatory for this field
const required: Field = {
	name: "required",
	type: "checkbox",
	label: "Required",
	admin: { width: "50%" },
};

// specifies hint text to display inside the empty input field
const placeholder: Field = {
	name: "placeholder",
	type: "text",
	label: "Placeholder",
	admin: { width: "50%" },
};

// sets the initial value of the field when a new document is created
const defaultValue: Field = {
	name: "defaultValue",
	type: "text",
	label: "Default Value",
	admin: { width: "50%" },
};

// allows developers to specify the column width for the field in the admin ui
const width: Field = {
	name: "width",
	type: "select",
	defaultValue: "full",
	options: [
		{ value: "full", label: "100%" },
		{ value: "3/4", label: "75%" },
		{ value: "2/3", label: "66%" },
		{ value: "1/2", label: "50%" },
		{ value: "1/3", label: "33%" },
		{ value: "1/4", label: "25%" },
	],
};

// hides the field from administrative users, typically used for fields managed programmatically
const hidden: Field = {
	name: "hidden",
	type: "checkbox",
	label: "Hidden Field?",
	admin: { width: "50%" },
};

export { defaultValue, hidden, label, name, placeholder, required, width };
