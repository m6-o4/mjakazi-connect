import { Loader } from "lucide-react";

// defines the required properties for the submit button component
type SubmitButtonProps = {
	loading: boolean; // controls the disabled state and spinner visibility
	text: string; // the primary label of the button
	form?: string; // optional form id to associate the button with an external form
};

// this component provides a styled submit button with a built-in loading spinner
const SubmitButton = ({ loading, text, form }: SubmitButtonProps) => {
	return (
		<button
			type={"submit"}
			// applies conditional styling for loading state and sets cursor
			className={`${loading ? "cursor-not-allowed" : "cursor-pointer"} bg-brand-accent hover:bg-brand-accent-hover flex w-full items-center justify-center gap-4 rounded-md p-2 text-white transition-all`}
			// disables the button when loading to prevent duplicate submissions
			disabled={loading}
			// associates the button with a specific form element via its ID
			form={form}
		>
			{text} {/* the loader icon spins when the 'loading' prop is true */}
			<Loader className={`animate-spin ${loading ? "inline-block" : "hidden"}`} />
		</button>
	);
};

// exports the component using the named export syntax
export { SubmitButton };
