"use client";

import type { Props as MediaProps } from "@/components/media/types";
import { cn } from "@/lib/utils";
import { getMediaUrl } from "@/payload/utilities/get-media-url";
import { useEffect, useRef } from "react";

/**
 * renders a video element using payload cms media data.
 * it is configured for background video usage: autoplay, loop, and muted.
 */
const VideoMedia = ({ onClick, resource, videoClassName }: MediaProps) => {
	// creates a ref to directly access the native html <video> dom element.
	const videoRef = useRef<HTMLVideoElement>(null);

	// useeffect hook to attach a temporary event listener on component mount.
	// this is often a remnant or placeholder for handling browser-specific media events.
	useEffect(() => {
		const { current: video } = videoRef;

		if (video) {
			// attaches a no-operation listener for the 'suspend' event.
			// this might be a temporary fix for certain browser media loading behaviors.
			video.addEventListener("suspend", () => {});
		}
		// runs only once on mount to establish the dom reference listener.
	}, []);

	// conditional rendering: only proceed if the resource data object is fully present.
	if (resource && typeof resource === "object") {
		const { filename } = resource;

		return (
			<video
				// enables automatic playback when the video loads, often necessary for background media.
				autoPlay
				// merges custom tailwind classes onto the video element.
				className={cn(videoClassName)}
				// disables native browser controls, intended for background or decorative video.
				controls={false}
				// ensures the video repeats indefinitely.
				loop
				// disables audio, which is necessary for automatic playback in most browsers.
				muted
				onClick={onClick}
				// ensures the video is played inline within the element's bounds (important for ios).
				playsInline
				// attaches the ref for direct dom access.
				ref={videoRef}
			>
				{/* defines the video source by constructing the full url using the filename from payload. */}
				<source src={getMediaUrl(`/media/${filename}`)} />
			</video>
		);
	}

	// returns null if the resource is missing or invalid.
	return null;
};

export { VideoMedia };
