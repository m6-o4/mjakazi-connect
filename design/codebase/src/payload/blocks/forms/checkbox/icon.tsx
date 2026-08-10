"use client";

import { cn } from "@/lib/utils";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { forwardRef } from "react";

// defines the props by combining radix-ui's checkbox root props with standard html element props
type CheckboxProps = React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>;

// this component creates a custom checkbox based on the radix-ui primitive, ensuring accessibility and custom styling
const Checkbox = forwardRef<HTMLButtonElement, CheckboxProps>(
	({ className, ...props }, ref) => (
		// CheckboxPrimitive.Root provides the base functionality, state, and accessibility attributes
		<CheckboxPrimitive.Root
			className={cn(
				// peer class is added for easier styling of sibling elements when the checkbox state changes
				// defines default size, shape, and focus ring styling
				// applies primary color styles when the checkbox is in the 'checked' state
				"peer border-primary ring-offset-background focus-visible:ring-ring data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground size-4 shrink-0 rounded border focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
				className,
			)}
			ref={ref}
			{...props}
		>
			{/* CheckboxPrimitive.Indicator only shows the checkmark when the checkbox state is 'checked' */}
			<CheckboxPrimitive.Indicator
				className={cn("flex items-center justify-center text-current")}
			>
				{/* lucide-react's Check icon visually represents the checked state */}
				<Check className="size-4" />
			</CheckboxPrimitive.Indicator>
		</CheckboxPrimitive.Root>
	),
);

// sets a display name for easier debugging in react dev tools
Checkbox.displayName = "Checkbox";

export { Checkbox };
