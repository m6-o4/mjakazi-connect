import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Page, Post } from "@/payload-types";
import Link from "next/link";
import { ReactNode } from "react";

// defines the properties for the cmslink component, mirroring the structure of a link field in Payload CMS.
type CMSLinkType = {
	// how the link should look: "inline" (text) or a button variant (e.g., "default", "outline").
	appearance?: "inline" | ButtonProps["variant"];
	// optional react nodes passed as children to display inside the link.
	children?: ReactNode;
	// custom tailwind classes to apply to the link or button element.
	className?: string;
	// the text label for the link.
	label?: string | null;
	// indicates if the link should open in a new tab.
	newTab?: boolean | null;
	// the payload reference object for internal links.
	reference?: {
		// the collection being linked to (e.g., "pages" or "posts").
		relationTo: "pages" | "posts";
		// the actual document object or its id.
		value: Page | Post | string | number;
	} | null;
	// the size of the button if appearance is not 'inline'.
	size?: ButtonProps["size"] | null;
	// the type of link: 'custom' (external url) or 'reference' (internal payload document).
	type?: "custom" | "reference" | null;
	// the raw url string for 'custom' links.
	url?: string | null;
};

/**
 * a universal component to render links, capable of handling payload
 * document references and external urls, and styling them as either inline text or buttons.
 */
const CMSLink = ({
	type,
	appearance = "inline",
	children,
	className,
	label,
	newTab,
	reference,
	size: sizeFromProps,
	url,
}: CMSLinkType) => {
	// determines the final href based on the link type configuration.
	const href =
		// check if link type is 'reference' and the document object exists and has a slug.
		type === "reference" && typeof reference?.value === "object" && reference.value.slug
			? // constructs the internal path, ensuring '/posts' prefix is added if not linking to a 'page'.
				`${reference?.relationTo !== "pages" ? `/${reference?.relationTo}` : ""}/${reference.value.slug}`
			: // otherwise, fall back to the raw custom url string.
				url;

	// return null if no valid url could be determined from either reference or custom url.
	if (!href) return null;

	// adjusts button size if appearance is not explicitly 'inline', defaulting to a standard size.
	const size = appearance === "inline" ? "clear" : sizeFromProps;
	// sets props for security and functionality when opening in a new tab.
	const newTabProps = newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

	// rendering logic: check if the link should be rendered as plain text or a styled button.
	if (appearance === "inline") {
		// render as a standard anchor tag using next/link for internal routing performance.
		return (
			<Link className={cn(className)} href={href} {...newTabProps}>
				{/* render label or children if provided */}
				{label && label}
				{children && children}
			</Link>
		);
	}

	// if appearance is a button variant, render as a styled button wrapping a link.
	return (
		<Button asChild className={className} size={size} variant={appearance}>
			{/* the button uses aschild, making the inner link component inherit the button's styling and functionality. */}
			<Link href={href} {...newTabProps}>
				{label && label}
				{children && children}
			</Link>
		</Button>
	);
};

export { CMSLink };
