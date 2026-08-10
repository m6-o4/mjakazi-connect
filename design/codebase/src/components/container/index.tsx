import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

// define the component's props by inheriting all standard attributes of a native <div> element.
type ContainerProps = ComponentProps<"div">;

// a reusable layout wrapper that establishes consistent layout boundaries for page content.
const Container = ({ children, className, ...props }: ContainerProps) => {
	return (
		// the div element serves as the primary layout wrapper for all content.
		<div
			{...props}
			// cn utility merges the default layout classes with any custom classes passed by the user.
			className={cn(
				// 'container' sets a max-width based on tailwind's responsive breakpoints.
				// 'mx-auto' centers the container horizontally within the parent element.
				// 'px-6' applies default horizontal padding (1.5rem).
				// 'py-8' applies default vertical padding (2rem).
				"container mx-auto px-6 py-8",
				className,
			)}
		>
			{children}
		</div>
	);
};

export { Container };
