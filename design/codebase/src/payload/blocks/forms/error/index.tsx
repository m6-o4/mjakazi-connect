"use client";

import { useFormContext } from "react-hook-form";

// component to display validation errors for a specific form field
const Error = ({ name }: { name: string }) => {
	// retrieves the current form state, specifically the errors object, from react-hook-form
	const {
		formState: { errors },
	} = useFormContext();

	return (
		// uses tailwind css classes to style the error message with red text
		<div className="mt-2 text-sm text-red-500">
			{/* attempts to display the custom error message for the field; 
      		falls back to a generic 'required' message if a specific message
				is missing */}
			{(errors[name]?.message as string) || "This is a required field."}
		</div>
	);
};

export { Error };
