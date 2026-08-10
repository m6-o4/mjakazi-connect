"use client";

import { Button } from "@/components/ui/button";
import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

// development-only component — never renders in production
// simulates payment confirmation to move verification from
// pending_payment → pending_review without real M-Pesa flow
const DevPaymentBypassCard = () => {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleSimulate = async () => {
		setLoading(true);
		setError(null);

		try {
			const res = await fetch("/apis/payments/mock", {
				method: "POST",
			});

			if (res.ok) {
				router.refresh();
			} else {
				const data = await res.json();
				setError(data.error ?? "Simulation failed.");
			}
		} catch {
			setError("Network error. Please try again.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="border-border rounded-xl border border-dashed bg-amber-50/50 p-6 dark:bg-amber-950/10">
			<div className="mb-3 flex items-center gap-2">
				<FlaskConical className="h-4 w-4 text-amber-600" />
				<p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
					Dev Only — Payment Bypass
				</p>
			</div>
			<p className="mb-4 text-xs text-amber-600/80 dark:text-amber-500/80">
				This card is only visible when{" "}
				<code className="font-mono">ENABLE_PAYMENT_BYPASS=true</code>. It simulates a
				confirmed M-Pesa payment and moves the verification to pending review.
			</p>
			<Button
				onClick={handleSimulate}
				disabled={loading}
				variant="outline"
				className="w-full gap-2 border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-400 dark:hover:bg-amber-950/40"
			>
				<FlaskConical className="h-4 w-4" />
				{loading ? "Simulating..." : "Simulate Payment Confirmation"}
			</Button>
			{error && <p className="text-destructive mt-2 text-xs">{error}</p>}
		</div>
	);
};

export { DevPaymentBypassCard };
