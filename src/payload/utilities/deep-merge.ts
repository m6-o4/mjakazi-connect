const isObject = (item: unknown): item is Record<string, unknown> => {
	return typeof item === "object" && item !== null && !Array.isArray(item);
};

// recursively merges two objects into a single object
// nested objects are merged, while non-object values in the source overwrite those in the target
const deepMerge = <T extends Record<string, unknown>, R extends Record<string, unknown>>(
	target: T,
	source: R,
): T & R => {
	const output: Record<string, unknown> = { ...target };

	if (isObject(target) && isObject(source)) {
		for (const key of Object.keys(source)) {
			const sourceValue = source[key];
			const targetValue = target[key as keyof T];

			if (isObject(sourceValue)) {
				output[key] =
					key in target && isObject(targetValue)
						? deepMerge(targetValue as Record<string, unknown>, sourceValue)
						: sourceValue;
			} else {
				output[key] = sourceValue;
			}
		}
	}

	return output as T & R;
};

export { isObject, deepMerge as default };
