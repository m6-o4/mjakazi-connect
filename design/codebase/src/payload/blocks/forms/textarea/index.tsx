import { Error } from "@/payload/blocks/forms/error";
import type { TextAreaField } from "@payloadcms/plugin-form-builder/types";
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from "react-hook-form";

// defines the combined props required for the textarea component
type TextareaProps = {
	// errors object from react-hook-form to display validation feedback
	errors: Partial<FieldErrorsImpl<{ [x: string]: any }>>;
	// register function from react-hook-form to connect the input field to the form state
	register: UseFormRegister<any & FieldValues>;
	// number of lines the textarea should display by default
	rows?: number;
} & TextAreaField;

// this component renders a textarea input field, handling form state and error display
const Textarea = ({
	name,
	errors,
	label,
	register,
	required: requiredFromProps,
	rows = 3,
}: TextareaProps) => {
	return (
		// ensures the component occupies the full width of its container
		<div className={`w-full`}>
			<div className={`relative mb-4`}>
				{/* label includes an asterisk and screen reader text if the field is required */}
				<label className={`mb-4 block`} htmlFor={name}>
					{label}
					{requiredFromProps ? (
						<span className={"ms-1 text-red-500"}>
							* <span className="sr-only">{"required)"}</span>
						</span>
					) : (
						""
					)}
				</label>
				<textarea
					// uses tailwind css for consistent styling
					className={`w-full rounded-md border border-emerald-950 bg-white p-2 leading-tight text-emerald-950`}
					id={name}
					// sets the visible height of the textarea
					rows={rows}
					// registers the textarea with react-hook-form, applying the required rule if set
					{...register(name, { required: requiredFromProps })}
				/>
				{/* displays the error component only if a validation error exists for this field */}
				{errors[name] && <Error name={name} />}
			</div>
		</div>
	);
};

export { Textarea };
