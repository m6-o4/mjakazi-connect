import type { FieldHook } from "payload";

const formatSlug = (val: string): string | undefined =>
	val
		?.replace(/ /g, "-")
		.replace(/[^\w-]+/g, "")
		.toLowerCase();

const formatSlugHook =
	(fallback: string): FieldHook =>
	({ data, operation, value }) => {
		if (typeof value === "string") {
			return formatSlug(value);
		}

		if (operation === "create" || data?.slug === undefined) {
			const fallbackData = data?.[fallback];

			if (typeof fallbackData === "string") {
				return formatSlug(fallbackData);
			}
		}

		return value;
	};

export { formatSlug, formatSlugHook };
