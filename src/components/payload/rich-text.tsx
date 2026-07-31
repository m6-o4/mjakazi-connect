import { cn } from "@/lib/utils";
import type {
	BannerBlock as BannerBlockProps,
	MediaBlock as MediaBlockProps,
} from "@/payload-types";
import { BannerBlock } from "@/payload/blocks/banner/component";
import { CodeBlock, CodeBlockProps } from "@/payload/blocks/code/component";
import { MediaBlock } from "@/payload/blocks/media/component";
import {
	DefaultNodeTypes,
	SerializedBlockNode,
	SerializedLinkNode,
	type DefaultTypedEditorState,
} from "@payloadcms/richtext-lexical";
import {
	RichText as ConvertRichText,
	JSXConvertersFunction,
	LinkJSXConverter,
} from "@payloadcms/richtext-lexical/react";
import { HTMLAttributes } from "react";

// defines the custom structure of block nodes expected within the lexical data.
type NodeTypes =
	| DefaultNodeTypes
	| SerializedBlockNode<MediaBlockProps | BannerBlockProps | CodeBlockProps>;

// custom function to translate internal document link data (from payload)
// into a usable frontend url path (e.g., converting a 'post' relationship slug to '/posts/[slug]').
const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
	const { value, relationTo } = linkNode.fields.doc!;

	if (typeof value !== "object") {
		throw new Error("expected value to be an object.");
	}

	const slug = value.slug;

	return relationTo === "posts" ? `/posts/${slug}` : `/${slug}`;
};

// defines the comprehensive set of rules for converting lexical json nodes
// into react jsx elements, including custom payload blocks.
const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
	...defaultConverters,
	...LinkJSXConverter({ internalDocToHref }),
	blocks: {
		banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
		media: ({ node }) => (
			<MediaBlock
				className="col-span-3 col-start-1"
				imgClassName="m-0"
				{...node.fields}
				captionClassName="mx-auto max-w-[48rem]"
				enableGutter={false}
				disableInnerContainer={true}
			/>
		),
		code: ({ node }) => <CodeBlock className="col-start-2" {...node.fields} />,
	},
});

// defines the component props, including the required rich text data and optional layout controls.
type Props = {
	data: DefaultTypedEditorState;
	enableGutter?: boolean;
	enableProse?: boolean;
} & HTMLAttributes<HTMLDivElement>;

// the main component that renders payload lexical rich text.
// it applies custom block converters and styles the output using tailwind typography.
const RichText = (props: Props) => {
	const { className, enableProse = true, enableGutter = true, data, ...rest } = props;
	return (
		// convertrichtext is the external component that executes the rendering logic.
		<ConvertRichText
			converters={jsxConverters}
			data={data}
			className={cn(
				"payload-richtext",
				{
					container: enableGutter,
					"max-w-none": !enableGutter,
					"prose md:prose-md dark:prose-invert mx-auto": enableProse,
				},
				className,
			)}
			{...rest}
		/>
	);
};

export { RichText };
