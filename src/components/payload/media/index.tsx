import { ImageMedia } from "@/components/payload/media/image-media";
import type { Props } from "@/components/payload/media/types";
import { VideoMedia } from "@/components/payload/media/video-media";
import React, { Fragment } from "react";

// the primary media component that acts as a router for image and video rendering.
// it inspects the payload media object's mime type to determine the correct sub-component
// and wraps the rendered output in a customizable html tag.
const Media = ({ className, htmlElement = "div", resource, ...rest }: Props) => {
	const isVideo = typeof resource === "object" && resource?.mimeType?.includes("video");
	const Tag = htmlElement || Fragment;

	return (
		<Tag {...(htmlElement !== null ? { className } : {})}>
			{isVideo ? (
				<VideoMedia resource={resource} className={className} {...rest} />
			) : (
				<ImageMedia resource={resource} className={className} {...rest} />
			)}
		</Tag>
	);
};

export { Media };
