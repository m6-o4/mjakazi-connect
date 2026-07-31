import { cn } from "@/lib/utils";
import { ComponentProps } from "react";

type ContainerProps = ComponentProps<"div">;

const Container = ({ children, className, ...props }: ContainerProps) => {
	return (
		<div {...props} className={cn("container mx-auto px-6 py-8", className)}>
			{children}
		</div>
	);
};

export { Container };
