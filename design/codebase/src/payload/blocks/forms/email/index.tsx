import { Input } from "@/payload/blocks/forms/input";
import { Width } from "@/payload/blocks/forms/width";
import type { EmailField } from "@payloadcms/plugin-form-builder/types";
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from "react-hook-form";

// defines the combined props required for the email input component
type EmailProps = {
	// errors object from react-hook-form to display validation feedback
	errors: Partial<FieldErrorsImpl<{ [x: string]: any }>>;
	// register function from react-hook-form to connect the input field to the form state
	register: UseFormRegister<any & FieldValues>;
} & EmailField & {
		// a boolean to visually hide the field
		hidden: boolean;
		// a string defining the column width in the layout (e.g., '1/2', 'full')
		width: string;
		// optional text hint displayed inside the input
		placeholder?: string;
		// the user-friendly name displayed above the input
		label: string;
	};

// this component serves as a wrapper to render an email field, applying layout rules and reusing the base FormInput
export const Email = ({
	name,
	errors,
	label,
	register,
	required: requiredFromProps,
	hidden: hiddenFromProps,
	width,
	placeholder,
}: EmailProps) => {
	return (
		// uses the custom width component to control the field's column size
		<Width width={width}>
			{/* reuses the generic FormInput component, setting the native type to 'email' 
      for built-in browser validation and keyboard display */}
			<Input
				errors={errors}
				name={name}
				label={label}
				type="email" // explicitly sets the type to 'email'
				placeholder={placeholder}
				required={requiredFromProps}
				hidden={hiddenFromProps}
				register={register}
			/>
		</Width>
	);
};
