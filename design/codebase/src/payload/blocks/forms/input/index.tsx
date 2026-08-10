import { Error } from "@/payload/blocks/forms/error";
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from "react-hook-form";

// defines all properties accepted by the form input component
type Props = {
	// errors object from react-hook-form to check for validation issues
	errors: Partial<FieldErrorsImpl<{ [x: string]: any }>>;
	// the user-friendly name displayed for the input
	label: string;
	// the field's unique identifier and key for react-hook-form registration
	name: string;
	// specifies the native html input type for browser rendering and validation
	type: "text" | "password" | "email" | "phone" | "number";
	// optional text hint displayed inside the input
	placeholder?: string;
	// flag indicating if the field must contain a value
	required?: boolean;
	// optional initial value for the field
	defaultValue?: string;
	// boolean to visually hide the entire input block
	hidden?: boolean;
	// function from react-hook-form to register the input for state and validation
	register: UseFormRegister<any & FieldValues>;
};

// this component renders a customizable text-based input field, integrating client-side validation and styling
const Input = (props: Props) => {
	// currently, this is set up to handle only basic requirements, but it serves as an extension point for complex validation rules
	let pattern;
	switch (props.type) {
		case "number":
		case "text":
			// applies a simple 'required' validation rule if the prop is set
			pattern = { required: props.required };
			break;
		case "phone":
			pattern = {
				required: props.required,
				pattern: {
					message: "Please format your phone number like this: +123 456 789012.",
					value: /^\+\d{1,4}\s?\d{2,3}\s?\d{3}\s?\d{4,6}$/,
				},
			};
			break;
		case "email":
			pattern = {
				required: props.required,
				pattern: {
					message: "Please enter a valid email address.",
					value: /^\S[^\s@]*@\S+$/,
				},
			};
			break;
		// other input types could have custom patterns defined here
	}

	return (
		<div className={props.hidden ? "hidden" : `flex flex-col gap-2`}>
			{/* the label includes an asterisk and screen reader text if the field is required */}
			<label htmlFor={props.name}>
				{props.label}
				{props.required ? (
					<span className={"ms-1 text-red-500"}>
						* <span className="sr-only">(required)</span>
					</span>
				) : (
					""
				)}
			</label>
			<input
				required={props.required}
				// uses tailwind css for consistent styling across the application
				className={`w-full rounded-md border border-emerald-950 bg-white p-2 leading-tight text-emerald-950`}
				id={props.name}
				// defaults the placeholder text if none is provided
				placeholder={
					props.placeholder
						? props.placeholder
						: `Enter your ${props.label.toLowerCase()}`
				}
				type={props.type}
				hidden={props.hidden}
				// sets the initial value if provided
				defaultValue={props.defaultValue ? props.defaultValue : ""}
				// spreads react-hook-form registration properties onto the input element, connecting it to the form
				{...props.register(props.name, pattern)}
			/>
			{/* displays the error component only if a validation error exists for this field */}
			{props.errors[props.name] && <Error name={props.name} />}
		</div>
	);
};

export { Input };
