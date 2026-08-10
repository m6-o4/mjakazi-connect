import { Input } from "@/payload/blocks/forms/input";
import { Width } from "@/payload/blocks/forms/width";
import type { TextField } from "@payloadcms/plugin-form-builder/types";
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from "react-hook-form";

// defines the combined props required for the text input component
type TextProps = {
	// errors object from react-hook-form to display validation feedback
	errors: Partial<FieldErrorsImpl<{ [x: string]: any }>>;
	// register function from react-hook-form to connect the input field to the form state
	register: UseFormRegister<any & FieldValues>;
} & TextField & {
		// a boolean to visually hide the field
		hidden: boolean;
		// a string defining the column width in the layout (e.g., '1/2', 'full')
		width: string;
		// optional text hint displayed inside the input
		placeholder?: string;
		// the user-friendly name displayed above the input
		label: string;
	};

// this component serves as a wrapper to render a standard text field
// using the custom FormInput component while applying layout rules from the Width component
const Text = ({
	name,
	errors,
	label,
	register,
	required: requiredFromProps,
	hidden: hiddenFromProps,
	width,
	placeholder,
}: TextProps) => {
	return (
		// uses the custom width component to control the field's column size in the layout
		<Width width={width}>
			{/* passes all necessary props to the reusable FormInput component, 
      specifying the native type as 'text' */}
			<Input
				errors={errors}
				name={name}
				label={label}
				type="text"
				placeholder={placeholder}
				required={requiredFromProps}
				hidden={hiddenFromProps}
				register={register}
			/>
		</Width>
	);
};

export { Text };
