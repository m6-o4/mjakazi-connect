import { useEffect, useState } from "react";

// custom hook that delays updating a value until a given time passes without change
const useDebounce = <T>(value: T, delay = 200): T => {
	// store the debounced version of the value
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		// wait for the specified delay before updating the value
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		// clear the timeout if the value or delay changes before it completes
		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]); // run effect again only when value or delay changes

	// return the delayed value
	return debouncedValue;
};

export { useDebounce };
