"use client";

import { Button } from "@/components/ui/button";
import { CopyIcon } from "@payloadcms/ui/icons/Copy";
import { useState } from "react";

// a client-side button component that copies the provided code string to the clipboard
// and provides visual feedback to the user.
const CopyButton = ({ code }: { code: string }) => {
	const [text, setText] = useState("Copy");

	// helper function to update the button text after a successful copy operation
	function updateCopyStatus() {
		if (text === "Copy") {
			setText("Copied!");
			setTimeout(() => {
				setText("Copy");
			}, 1000);
		}
	}

	return (
		<div className="flex justify-end align-middle">
			<Button
				className="flex gap-1"
				variant={"secondary"}
				onClick={async () => {
					await navigator.clipboard.writeText(code);
					updateCopyStatus();
				}}
			>
				<p>{text}</p>
				<CopyIcon />
			</Button>
		</div>
	);
};

export { CopyButton };
