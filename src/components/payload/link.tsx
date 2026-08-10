import Link from "next/link";
import { ReactNode } from "react";

import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Page, Post } from "@/payload-types";

type CMSLinkType = {
	appearance?: "inline" | ButtonProps["variant"];
	children?: ReactNode;
	className?: string;
	label?: string | null;
	newTab?: boolean | null;
	reference?: {
		relationTo: "pages" | "posts";
		value: Page | Post | string | number;
	} | null;
	size?: ButtonProps["size"] | null;
	type?: "custom" | "reference" | null;
	url?: string | null;
};

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
	const href =
		type === "reference" && typeof reference?.value === "object" && reference.value.slug
			? `${reference?.relationTo !== "pages" ? `/${reference?.relationTo}` : ""}/${reference.value.slug}`
			: url;

	if (!href) return null;

	const size = sizeFromProps;
	const newTabProps = newTab ? { rel: "noopener noreferrer", target: "_blank" } : {};

	if (appearance === "inline") {
		return (
			<Link className={cn(className)} href={href} {...newTabProps}>
				{label && label}
				{children && children}
			</Link>
		);
	}

	return (
		<Button
			render={
				<Link href={href} {...newTabProps}>
					{label && label}
					{children && children}
				</Link>
			}
			nativeButton={false}
			className={className}
			size={size}
			variant={appearance}
		/>
	);
};

export { CMSLink };
