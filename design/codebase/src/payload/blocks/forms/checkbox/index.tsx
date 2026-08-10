import { Checkbox as CheckboxUI } from "@/payload/blocks/forms/checkbox/icon";
import { Error } from "@/payload/blocks/forms/error";
import { Width } from "@/payload/blocks/forms/width";
import type { CheckboxField } from "@payloadcms/plugin-form-builder/types";
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from "react-hook-form";
import { useFormContext } from "react-hook-form";

// defines all properties required for the checkbox field
type CheckboxProps = CheckboxField & {
	// errors object from react-hook-form to check for validation issues
	errors: Partial<FieldErrorsImpl>;
	// register function from react-hook-form to wire up the input
	register: UseFormRegister<FieldValues>;
} & {
	// a string defining the column width in the layout (e.g., '1/2', 'full')
	width: string;
};

// this component renders a custom checkbox field, integrating with Payload fields, react-hook-form, and layout rules
export const Checkbox = ({
	name,
	defaultValue,
	errors,
	label,
	register,
	required,
	width,
}: CheckboxProps) => {
	// register the field with react-hook-form and capture its resulting props
	const props = register(name, { required: required });
	// retrieve the setValue function to manually update the form state
	const { setValue } = useFormContext();

	return (
		// uses the custom width component to control the field's column size
		<Width width={width}>
			<div className="flex items-center gap-2">
				{/* CheckboxUi is the presentation layer, receiving props from react-hook-form */}
				<CheckboxUI
					defaultChecked={defaultValue}
					id={name}
					{...props}
					// intercepts the onCheckedChange event to manually update react-hook-form state
					onCheckedChange={(checked) => {
						// updates the form state using the setValue method
						setValue(props.name, checked);
					}}
				/>
				<label htmlFor={name}>
					{/* displays an asterisk if the field is marked as required */}
					{required && (
						<span className="ms-1 text-red-500">
							* <span className="sr-only">(required)</span>
						</span>
					)}
					{label}
				</label>
			</div>
			{/* displays the error component only if a validation error exists for this field */}
			{errors[name] && <Error name={name} />}
		</Width>
	);
};
