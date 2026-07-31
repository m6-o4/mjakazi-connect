"use client";

import { CopyButton } from "@/payload/blocks/code/copy-button";
import { Highlight, themes } from "prism-react-renderer";

type Props = {
	code: string;
	language?: string;
};

/**
 * a client-side component that displays and highlights code using prism-react-renderer.
 * it includes line numbers and a copy button.
 */
const Code = ({ code, language = "" }: Props) => {
	if (!code) return null;

	return (
		<Highlight code={code} language={language} theme={themes.vsDark}>
			{({ getLineProps, getTokenProps, tokens }) => (
				<pre className="border-border relative overflow-x-auto rounded border bg-black p-4 text-xs">
					{tokens.map((line, i) => (
						<div key={i} {...getLineProps({ className: "table-row", line })}>
							<span className="table-cell pr-4 text-right text-white/25 select-none">
								{i + 1}
							</span>
							<span className="table-cell">
								{line.map((token, key) => (
									<span key={key} {...getTokenProps({ token })} />
								))}
							</span>
						</div>
					))}
					<CopyButton code={code} />
				</pre>
			)}
		</Highlight>
	);
};

export { Code };
