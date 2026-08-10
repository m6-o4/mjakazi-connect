import type { FormFieldBlock } from "@payloadcms/plugin-form-builder/types";

// exported type for react-hook-form default values
export type rhfdefaultvalues = Record<string, any>;

// named arrow function to convert payload form fields into default values for react-hook-form
const mapPayloadFieldsToRHFDefaults = (fields: FormFieldBlock[]): rhfdefaultvalues => {
	if (!fields) return {};

	return fields.reduce((defaults, field) => {
		// ignore fields without a name since they cannot be submitted
		if ("name" in field && field.name) {
			// determine default value: false for checkboxes, empty string for everything else
			const defaultValue = field.blockType === "checkbox" ? false : "";

			// store default value under the field's name
			defaults[field.name] = defaultValue;
		}
		return defaults;
	}, {} as rhfdefaultvalues);
};

// export the function using named export syntax
export { mapPayloadFieldsToRHFDefaults };
