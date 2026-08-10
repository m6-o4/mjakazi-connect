import type { Media as MediaType } from "@/payload-types";
import type { StaticImageData } from "next/image";
import type { ElementType, Ref } from "react";

/**
 * defines the props for a versatile media component capable of rendering
 * payload cms media, static next.js images, or standard html elements (e.g., video/img).
 */
export interface Props {
	// standard alt text for accessibility when rendering images.
	alt?: string;
	// classes applied to the root element wrapping the media.
	className?: string;
	// boolean flag to make the image fill the parent container (next.js image specific).
	fill?: boolean;
	// allows the component to be rendered as a different html element (e.g., 'div').
	htmlElement?: ElementType | null;
	// classes applied specifically to the picture element wrapper, if used.
	pictureClassName?: string;
	// classes applied directly to the final <img> element.
	imgClassName?: string;
	// click event handler for user interaction.
	onClick?: () => void;
	// load event handler, primarily useful for tracking image loading status.
	onLoad?: () => void;
	// loading strategy for the image ('lazy' is default) (next.js image specific).
	loading?: "lazy" | "eager";
	// preload loading flag for lcp images (next.js image specific).
	preload?: boolean;
	// forwarded ref for accessing the underlying dom element (img or video).
	ref?: Ref<HTMLImageElement | HTMLVideoElement | null>;
	// the source data: a full payload media object, its id, or its url string.
	resource?: MediaType | string | number | null;
	// sizes attribute for responsive image loading optimization (next.js image specific).
	size?: string;
	// source data for locally imported static images (next.js image specific).
	src?: StaticImageData;
	// boolean flag to disable image optimization (next.js image specific).
	unoptimized?: boolean;
	// classes applied specifically to the <video> element.
	videoClassName?: string;
}
