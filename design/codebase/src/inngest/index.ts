import { paymentTimeout } from "@/inngest/functions/payment-timeout";
import { subscriptionExpiry } from "@/inngest/functions/subscription-expiry";
import { subscriptionTimeout } from "@/inngest/functions/subscription-timeout";
import { verificationExpiry } from "@/inngest/functions/verification-expiry";

// all inngest functions registered here
export const functions = [
	verificationExpiry,
	paymentTimeout,
	subscriptionExpiry,
	subscriptionTimeout,
];
