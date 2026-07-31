import { Code } from "@/payload/blocks/code/component-client";

export type CodeBlockProps = {
	code: string;
	language?: string;
	blockType: "code";
};

type Props = CodeBlockProps & { className?: string };

// renders a server-side component wrapper for a client-side code highlighting component.
// it's structured as a block component for use within a payload cms layout.
const CodeBlock = ({ className, code, language }: Props) => {
	return (
		<div className={[className, "not-prose"].filter(Boolean).join(" ")}>
			<Code code={code} language={language} />
		</div>
	);
};

export { CodeBlock };
