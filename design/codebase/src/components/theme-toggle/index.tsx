"use client";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

/**
 * renders a dropdown menu that allows users to switch the site's color
 * theme between light, dark, and system preference.
 */
const ThemeToggle = () => {
	// destructures the 'settheme' function from the usetheme hook, which handles
	// updating the application's theme state (e.g., toggling the 'dark' class on the html tag).
	const { setTheme } = useTheme();

	return (
		<DropdownMenu>
			{/* the trigger button opens the menu. 'aschild' ensures the button component is used directly as the trigger element. */}
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" size="icon" className="rounded-lg">
					{/* sun icon: visible in light mode, rotates and scales out in dark mode. */}
					<Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
					{/* moon icon: hidden in light mode, scales in and rotates to zero in dark mode. */}
					<Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
					{/* accessibility text hidden from the screen but read by screen readers. */}
					<span className="sr-only">theme toggle</span>
				</Button>
			</DropdownMenuTrigger>

			{/* menu options content, aligned to the 'end' (right) of the trigger button. */}
			<DropdownMenuContent align="end">
				{/* dropdown item sets the theme to light when clicked. */}
				<DropdownMenuItem onClick={() => setTheme("light")}>light</DropdownMenuItem>
				{/* dropdown item sets the theme to dark when clicked. */}
				<DropdownMenuItem onClick={() => setTheme("dark")}>dark</DropdownMenuItem>
				{/* dropdown item sets the theme to match the operating system's preference when clicked. */}
				<DropdownMenuItem onClick={() => setTheme("system")}>system</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
};

export { ThemeToggle };
