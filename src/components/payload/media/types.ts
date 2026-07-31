import type { Media as MediaType } from "@/payload-types";
import type { StaticImageData } from "next/image";
import type { ElementType, Ref } from "react";

// defines the props for a versatile media component.
// it supports rendering images from payload cms, static imports,
//and allows for dynamic wrapping/styling of the underlying html.
export interface Props {
	alt?: string;
	className?: string;
	fill?: boolean;
	htmlElement?: ElementType | null;
	pictureClassName?: string;
	imgClassName?: string;
	onClick?: () => void;
	onLoad?: () => void;
	loading?: "lazy" | "eager";
	priority?: boolean;
	ref?: Ref<HTMLImageElement | HTMLVideoElement | null>;
	resource?: MediaType | string | number | null;
	size?: string;
	src?: StaticImageData;
	videoClassName?: string;
}
