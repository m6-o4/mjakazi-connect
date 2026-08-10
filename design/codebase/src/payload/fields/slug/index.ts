import { formatSlugHook } from "@/payload/fields/slug/format-slug";
import type { CheckboxField, TextField } from "payload";

type Overrides = { slugOverrides?: Partial<TextField>; checkboxOverrides?: Partial<CheckboxField> };

type Slug = (fieldToUse?: string, overrides?: Overrides) => [TextField, CheckboxField];

const slugField: Slug = (fieldToUse = "title", overrides = {}) => {
	const { slugOverrides, checkboxOverrides } = overrides;

	const checkBoxField: CheckboxField = {
		name: "slugLock",
		type: "checkbox",
		defaultValue: true,
		admin: { hidden: true, position: "sidebar" },
		...checkboxOverrides,
	};

	// @ts-expect-error - ts mismatch Partial<TextField> with TextField
	const slugField: TextField = {
		name: "slug",
		type: "text",
		index: true,
		label: "Slug",
		...(slugOverrides || {}),
		hooks: {
			// keep this in for hook or API based updates
			beforeValidate: [formatSlugHook(fieldToUse)],
		},
		admin: {
			position: "sidebar",
			...(slugOverrides?.admin || {}),
			components: {
				Field: {
					path: "@/payload/fields/slug/component#SlugComponent",
					clientProps: {
						fieldToUse,
						checkboxFieldPath: checkBoxField.name,
					},
				},
			},
		},
	};

	return [slugField, checkBoxField];
};

export { slugField };
