import { Media } from "@/components/media";
import { cn } from "@/lib/utils";
import type { MediaBlock as MediaBlockProps } from "@/payload-types";
import type { StaticImageData } from "next/image";

type Props = MediaBlockProps & {
	breakout?: boolean;
	captionClassName?: string;
	className?: string;
	enableGutter?: boolean;
	imgClassName?: string;
	staticImage?: StaticImageData;
	disableInnerContainer?: boolean;
};

/**
 * a block component for displaying a single image or video (media component) with an optional caption.
 * it handles both payload cms media relationships and static next.js images.
 */
const MediaBlock = (props: Props) => {
	const { className, enableGutter = true, imgClassName, media, staticImage } = props;

	return (
		<div
			className={cn(
				"",
				{
					container: enableGutter,
				},
				className,
			)}
		>
			{(media || staticImage) && (
				<Media
					imgClassName={cn("border border-border rounded-[0.8rem]", imgClassName)}
					resource={media}
					src={staticImage}
				/>
			)}
		</div>
	);
};

export { MediaBlock };
