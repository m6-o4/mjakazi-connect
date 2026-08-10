"use client";

import { useState } from "react";
import { CheckCircle2, Send } from "lucide-react";

interface EoiButtonProps {
	wajakaziProfileId: string;
	wajakaziFirstName: string;
}

// define potential UI states for the interaction
type EoiState = "idle" | "submitting" | "sent" | "duplicate" | "error";

const EoiButton = ({ wajakaziProfileId, wajakaziFirstName }: EoiButtonProps) => {
	const [state, setState] = useState<EoiState>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	const handleSend = async () => {
		setState("submitting");
		setErrorMessage(null);

		try {
			// request expression of interest creation from server
			const res = await fetch("/apis/eoi/send", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ wajakaziProfileId }),
			});

			if (res.ok) {
				setState("sent");
				return;
			}

			const data = await res.json();

			// handle existing interest conflict
			if (res.status === 409) {
				setState("duplicate");
				return;
			}

			// display specific server error or generic fallback
			setErrorMessage(data.error ?? "Something went wrong. Please try again.");
			setState("error");
		} catch {
			// handle network or transport layer failures
			setErrorMessage("Network error. Please try again.");
			setState("error");
		}
	};

	// show success feedback if eoi was submitted
	if (state === "sent") {
		return (
			<div className="bg-accent/10 flex items-center gap-3 rounded-lg px-4 py-3">
				<CheckCircle2 className="text-accent size-5 shrink-0" />
				<div>
					<p className="text-accent text-sm font-semibold">Expression of interest sent</p>
					<p className="text-muted-foreground text-xs">
						{wajakaziFirstName} has been notified and will expect your call.
					</p>
				</div>
			</div>
		);
	}

	// show state if interest was already expressed
	if (state === "duplicate") {
		return (
			<div className="bg-muted flex items-center gap-3 rounded-lg px-4 py-3">
				<CheckCircle2 className="text-muted-foreground size-5 shrink-0" />
				<p className="text-muted-foreground text-sm">
					You have already sent an expression of interest to {wajakaziFirstName}.
				</p>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2">
			<button
				onClick={handleSend}
				disabled={state === "submitting"}
				className="bg-primary text-primary-foreground hover:bg-primary/90 mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
			>
				<Send className="size-4" />
				{state === "submitting" ? "Sending..." : "Send Expression of Interest"}
			</button>
			{state === "error" && errorMessage && (
				<p className="text-destructive text-sm">{errorMessage}</p>
			)}
		</div>
	);
};

export { EoiButton };
