"use client";

import type { Props as MediaProps } from "@/components/payload/media/types";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/payload/utilities/get-media-url";
import { useEffect, useRef } from "react";

// a client-side component that renders a video element.
// it is specifically configured for decorative, background use:
// autoplaying, looping, and muted.
// it relies on a payload media object to construct the video source url.
const VideoMedia = ({ onClick, resource, videoClassName }: MediaProps) => {
	const videoRef = useRef<HTMLVideoElement>(null);

	// handles side effects after initial render.
	useEffect(() => {
		const { current: video } = videoRef;

		if (video) {
			video.addEventListener("suspend", () => {});
		}
	}, []);

	// ensure the resource is a valid object before attempting to render.
	if (resource && typeof resource === "object") {
		const { filename } = resource;

		return (
			<video
				autoPlay
				className={cn(videoClassName)}
				controls={false}
				loop
				muted
				onClick={onClick}
				playsInline
				ref={videoRef}
			>
				<source src={getMediaUrl(`/media/${filename}`)} />
			</video>
		);
	}

	return null;
};

export { VideoMedia };
