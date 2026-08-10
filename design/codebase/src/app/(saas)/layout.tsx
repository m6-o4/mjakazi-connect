import type { Metadata } from "next";
import { ReactNode } from "react";

// initialize global styles for the saas route segment
import "@/styles/globals.css";

// define shared metadata and branding for saas-related pages
export const metadata: Metadata = {
	title: {
		template: "%s | Mjakazi Connect",
		default: "Mjakazi Connect",
	},
	icons: {
		icon: "/favicon.svg",
		shortcut: "/favicon.svg",
		apple: "/favicon.svg",
	},
};

// provide a centered layout structure for saas views
const SaaSLayout = ({ children }: { children: ReactNode }) => {
	return <div className="flex min-h-screen items-center justify-center">{children}</div>;
};

export { SaaSLayout as default };
