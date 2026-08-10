import { RichText } from "@/components/rich-text";
import type { DefaultTypedEditorState } from "@payloadcms/richtext-lexical";

// defines the single prop required: the serialized content from a lexical rich text editor
type MessageProps = {
	// uses the payload-specific rich text type to ensure compatibility with RichText component
	message: DefaultTypedEditorState;
};

// this component is a dedicated wrapper for rendering serialized lexical rich text content
const Message = ({ message }: MessageProps) => {
	return (
		// container ensures the rich text occupies the full width
		<div className={`w-full`}>
			{/* conditionally renders the RichText component only if the message data exists,
      passing the message as the 'data' prop to the RichText renderer */}
			{message && <RichText data={message} />}
		</div>
	);
};

export { Message };
