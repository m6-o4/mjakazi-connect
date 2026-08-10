import { Input } from "@/payload/blocks/forms/input";
import { Width } from "@/payload/blocks/forms/width";
import type { FieldErrorsImpl, FieldValues, UseFormRegister } from "react-hook-form";

// defines the structure of props accepted by the phone input component
type PhoneProps = {
	errors: Partial<FieldErrorsImpl<{ [key: string]: any }>>;
	register: UseFormRegister<any & FieldValues>;
	hidden: boolean;
	width: string;
	placeholder?: string;
	label: string;
	name: string;
	required: boolean;
};

// renders a phone input field within a width-constrained container
// uses the shared form input component for consistency across form elements
const Phone = ({
	name,
	errors,
	label,
	register,
	required: requiredFromProps,
	hidden: hiddenFromProps,
	width,
	placeholder,
}: PhoneProps) => {
	return (
		<Width width={width}>
			<Input
				errors={errors}
				name={name}
				label={label}
				type="phone"
				placeholder={placeholder}
				required={requiredFromProps}
				hidden={hiddenFromProps}
				register={register}
			/>
		</Width>
	);
};

export { Phone };
