import { cn } from "@/lib/utils";
import type {
	BannerBlock as BannerBlockProps,
	MediaBlock as MediaBlockProps,
} from "@/payload-types";
import { BannerBlock } from "@/payload/blocks/banner/component";
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
	| SerializedBlockNode<MediaBlockProps | BannerBlockProps>;

// custom function to translate internal document link data (from payload)
// into a usable frontend url path (e.g., converting a 'post' relationship slug to '/posts/[slug]').
const internalDocToHref = ({ linkNode }: { linkNode: SerializedLinkNode }) => {
	// safely extract the target document and its collection relationship.
	const { value, relationTo } = linkNode.fields.doc!;

	// throw an error if the document value is not a usable object type.
	if (typeof value !== "object") {
		throw new Error("expected value to be an object.");
	}

	const slug = value.slug;
	// route content based on the collection name for correct linking structure.
	return relationTo === "posts" ? `/posts/${slug}` : `/${slug}`;
};

// defines the comprehensive set of rules for converting lexical json nodes
// into react jsx elements, including custom payload blocks.
const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
	// includes standard formatting converters (bold, italic, lists, etc.).
	...defaultConverters,
	// customizes link handling using the internaldochref function.
	...LinkJSXConverter({ internalDocToHref }),
	// defines custom block rendering rules by mapping blocktype to the component:
	blocks: {
		// renders a banner block with fixed styling for layout.
		banner: ({ node }) => <BannerBlock className="col-start-2 mb-4" {...node.fields} />,
		// renders a media block with specific layout classes for full-width presentation.
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
	},
});

// defines the component props, including the required rich text data and optional layout controls.
type Props = {
	data: DefaultTypedEditorState; // the json state from the lexical editor.
	enableGutter?: boolean; // controls whether to use a container for max-width/centering.
	enableProse?: boolean; // controls whether to apply tailwind typography styles.
} & HTMLAttributes<HTMLDivElement>;

/**
 * the main component that renders payload lexical rich text.
 * it applies custom block converters and styles the output using tailwind typography.
 */
const RichText = (props: Props) => {
	const { className, enableProse = true, enableGutter = true, data, ...rest } = props;
	return (
		// convertrichtext is the external component that executes the rendering logic.
		<ConvertRichText
			converters={jsxConverters} // passes the custom converter rules for blocks and links.
			data={data}
			className={cn(
				"payload-richtext",
				{
					// apply max-width/centering if the gutter is enabled.
					container: enableGutter,
					// override default max-width if the gutter is disabled, allowing full width.
					"max-w-none": !enableGutter,
					// apply tailwind typography styles for clean formatting of nested content.
					"prose md:prose-md dark:prose-invert mx-auto": enableProse,
				},
				// merges any user-provided classes onto the wrapper element.
				className,
			)}
			{...rest}
		/>
	);
};

export { RichText };
