import type { FieldHook } from "payload";

/**
 * formats a string to be url-safe by converting to lowercase, replacing spaces with hyphens, and removing special characters.
 * @param {string} val - the string to format.
 * @returns {string} the url-safe slug.
 */
const format = (val: string): string =>
	val
		.replace(/ /g, "-")
		.replace(/[^\w-]+/g, "")
		.toLowerCase();

/**
 * payload field hook that formats a value into a url slug, using a fallback field if the value is not present during creation.
 * @param {string} fallback - the name of the field to use as a fallback for the slug during 'create' operation.
 * @returns {FieldHook} the Payload Field Hook function.
 */
const formatSlug =
	(fallback: string): FieldHook =>
	({ data, operation, originalDoc, value }) => {
		// 1. if a value is manually provided, use and format it
		if (typeof value === "string") {
			return format(value);
		}

		// 2. if creating a new document, use and format the fallback field
		if (operation === "create") {
			const fallbackData = data?.[fallback] || originalDoc?.[fallback];

			if (fallbackData && typeof fallbackData === "string") {
				return format(fallbackData);
			}
		}

		// 3. otherwise, return the original value (which might be undefined or null)
		return value;
	};

export { formatSlug };
