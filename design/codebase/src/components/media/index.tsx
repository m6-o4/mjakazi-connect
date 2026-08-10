import { ImageMedia } from "@/components/media/image-media";
import type { Props } from "@/components/media/types";
import { VideoMedia } from "@/components/media/video-media";
import { Fragment } from "react";

/**
 * the main media abstraction component. it inspects the resource type to determine
 * whether to render an image or a video, providing a single component interface.
 */
const Media = ({ className, htmlElement = "div", resource, ...rest }: Props) => {
	// check if the media resource is an object and if its mimetype indicates a video.
	const isVideo = typeof resource === "object" && resource?.mimeType?.includes("video");

	// set the outer wrapper tag, defaulting to 'div' or using react.fragment if htmlElement is null.
	const Tag = htmlElement || Fragment;

	return (
		<Tag
			// conditionally spread props like 'className' onto the wrapper,
			// only if a specific html element is provided (fragment cannot accept these props).
			{...(htmlElement !== null
				? {
						className,
					}
				: {})}
		>
			{/* delegate rendering to the specific component based on the resource type check. */}
			{isVideo ? (
				<VideoMedia resource={resource} className={className} {...rest} />
			) : (
				<ImageMedia resource={resource} className={className} {...rest} />
			)}
		</Tag>
	);
};

export { Media };
