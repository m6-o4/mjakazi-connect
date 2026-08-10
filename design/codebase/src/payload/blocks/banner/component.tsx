import { RichText } from "@/components/rich-text";
import { cn } from "@/lib/utils";
import type { BannerBlock as BannerBlockProps } from "@/payload-types";

type Props = { className?: string } & BannerBlockProps;

/**
 * a reusable ui component that displays content within a styled, colored banner block.
 * the style (color) is determined by the 'style' prop from payload.
 */
const BannerBlock = ({ className, content, style }: Props) => {
	return (
		<div className={cn("mx-auto my-8 w-full", className)}>
			<div
				className={cn("flex items-center rounded border px-6 py-3", {
					"border-border bg-card": style === "info",
					"border-error bg-error/30": style === "error",
					"border-success bg-success/30": style === "success",
					"border-warning bg-warning/30": style === "warning",
				})}
			>
				<RichText data={content} enableGutter={false} enableProse={false} />
			</div>
		</div>
	);
};

export { BannerBlock };
