"use client";

import clarity from "@microsoft/clarity";
import { useEffect } from "react";

const ClarityTracker = () => {
	useEffect(() => {
		const clarityId = process.env.NEXT_PUBLIC_CLARITY_ID;
		const isProduction = process.env.NODE_ENV === "production";

		// check for a specific debug flag to allow testing in development without code changes
		const isDebug = process.env.NEXT_PUBLIC_CLARITY_DEBUG === "true";

		// fail safe: do nothing if the id is missing to prevent errors
		if (!clarityId) return;

		// primary logic: run silently in production, or run with logs if debug is forced
		if (isProduction) {
			clarity.init(clarityId);
		} else if (isDebug) {
			console.log("Clarity Debug - Forced initialization active");
			clarity.init(clarityId);
		} else {
			// standard dev behavior: log that we are dormant
			console.log("Clarity configured but dormant (set NEXT_PUBLIC_CLARITY_DEBUG=true to test)");
		}
	}, []);

	return null;
};

export { ClarityTracker };
