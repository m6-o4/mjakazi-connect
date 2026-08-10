"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { ComponentProps } from "react";

/**
 * a client-side wrapper around the core next-themes provider.
 * this component initializes and manages the application's theme state (dark/light/system).
 */
const ThemeProvider = ({
	children,
	...props
}: ComponentProps<typeof NextThemesProvider>) => {
	return (
		// renders the core provider component, spreading all configuration props to it.
		// this sets up the necessary context for theme switching across the entire application.
		<NextThemesProvider {...props}>{children}</NextThemesProvider>
	);
};

export { ThemeProvider };
