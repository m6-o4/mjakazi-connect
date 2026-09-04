"use client";

import { FlaskConical } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { simulatePaymentCallbackAction } from "@/app/actions/dev";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

// sandbox-only control. rendered only when MPESA_ENVIRONMENT !== "production"
// (the pages gate it), and the server action it calls is inert in production
// anyway. lets a mjakazi or mwajiri complete a sandbox payment without the
// daraja callback, by feeding a synthetic callback through the real handler.
const DevPaymentSimulate = () => {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const simulate = async () => {
		setLoading(true);
		setError(null);
		try {
			const result = await simulatePaymentCallbackAction();
			if (!result.success) {
				setError(result.error ?? "Could not simulate the payment.");
				return;
			}
			router.refresh();
		} catch {
			setError("Could not simulate the payment.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<FlaskConical className="text-accent size-4 shrink-0" />
					Development only
				</CardTitle>
				<CardDescription>
					The Daraja sandbox never fires a callback. Simulate a confirmed payment to
					advance to the next stage.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-2">
				<Button
					type="button"
					variant="outline"
					onClick={simulate}
					disabled={loading}
					className="w-full sm:w-auto"
				>
					{loading ? "Simulating..." : "Simulate payment confirmation"}
				</Button>
				{error ? <p className="text-destructive text-xs">{error}</p> : null}
			</CardContent>
		</Card>
	);
};

export { DevPaymentSimulate };
