"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { CopyIcon } from "@payloadcms/ui/icons/Copy";

// a client-side button component that copies the provided code string to the clipboard
// and provides visual feedback to the user.
const CopyButton = ({ code }: { code: string }) => {
	const [text, setText] = useState("Copy");

	const updateCopyStatus = () => {
		if (text === "Copy") {
			setText("Copied!");
			setTimeout(() => {
				setText("Copy");
			}, 1000);
		}
	};

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
