import { ReactNode } from "react";

const Width = ({ children, width }: { children: ReactNode; width: string }) => {
	// calculates the required width for the component based on the prop
	let calcWidth: string;
	switch (width) {
		case "full":
			// ensures 'full' fills the entire space
			calcWidth = `100%`;
			break;
		default:
			// converts fractional width (e.g., '1/2', '1/3') into a percentage,
			// and subtracts a small amount for necessary internal guttering
			calcWidth = `calc(${width} * 100% - 0.5rem)`;
			break;
	}
	// uses flexBasis to set the calculated width, allowing it to behave within a flex container
	return <div style={{ flexBasis: calcWidth }}>{children}</div>;
};

export { Width };
