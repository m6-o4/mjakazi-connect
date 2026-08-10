"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDebounce } from "@/payload/utilities/use-debounce";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// a client-side search component that updates the url query string
// after the user stops typing, enabling debounced search navigation
const Search = () => {
	// store the current search input value
	const [value, setValue] = useState("");
	// get access to the next.js router instance
	const router = useRouter();

	// apply debounce to delay route updates until the user pauses typing
	const debouncedValue = useDebounce(value);

	useEffect(() => {
		// update the route to include the search query parameter if a value exists
		router.push(`/search${debouncedValue ? `?q=${debouncedValue}` : ""}`);
	}, [debouncedValue, router]);

	return (
		<div>
			<form
				onSubmit={(e) => {
					// prevent form submission since navigation happens automatically
					e.preventDefault();
				}}
			>
				{/* accessible label for screen readers */}
				<Label htmlFor="search" className="sr-only">
					Search
				</Label>

				{/* input field for entering search terms */}
				<Input
					id="search"
					onChange={(event) => setValue(event.target.value)}
					placeholder="Search"
				/>

				{/* hidden submit button to maintain semantic form structure */}
				<button type="submit" className="sr-only">
					submit
				</button>
			</form>
		</div>
	);
};

export { Search };
