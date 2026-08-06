import { RichText } from "@/components/payload/rich-text";
import { cn } from "@/lib/utils";
import type { BannerBlock as BannerBlockProps } from "@/payload-types";

type Props = { className?: string } & BannerBlockProps;

const BannerBlock = ({ className, content, style }: Props) => {
	return (
		<div className={cn("mx-auto my-8 w-full", className)}>
			<div
				className={cn("flex items-center rounded-md border px-6 py-3", {
					"border-border bg-card": style === "info",
					"border-destructive bg-destructive/30": style === "error",
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
