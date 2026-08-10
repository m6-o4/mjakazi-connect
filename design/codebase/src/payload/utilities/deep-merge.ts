// checks if the given value is a plain object and not an array or null
const isObject = (item: unknown): item is Record<string, unknown> => {
	return typeof item === "object" && item !== null && !Array.isArray(item);
};

// recursively merges two objects into a single object
// nested objects are merged, while non-object values in the source overwrite those in the target
const deepMerge = <T extends Record<string, unknown>, R extends Record<string, unknown>>(
	target: T,
	source: R,
): T & R => {
	// create a shallow copy of the target to preserve immutability
	const output: Record<string, unknown> = { ...target };

	// ensure both target and source are objects before merging
	if (isObject(target) && isObject(source)) {
		for (const key of Object.keys(source)) {
			const sourceValue = source[key];
			const targetValue = target[key as keyof T];

			// if both values are objects, merge them recursively
			if (isObject(sourceValue)) {
				output[key] =
					key in target && isObject(targetValue)
						? deepMerge(targetValue as Record<string, unknown>, sourceValue)
						: sourceValue;
			} else {
				// otherwise, overwrite the target value
				output[key] = sourceValue;
			}
		}
	}

	// return the merged object with combined type
	return output as T & R;
};

export { isObject, deepMerge as default };
