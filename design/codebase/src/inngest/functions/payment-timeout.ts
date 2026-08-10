import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit";
import config from "@payload-config";
import { getPayload } from "payload";

// monitor and expire stk push payments without callbacks
export const paymentTimeout = inngest.createFunction(
	{
		id: "payment-timeout",
		name: "Payment STK Push Timeout",
		triggers: [{ event: "payment/stk.sent" }],
	},
	async ({ event, step }) => {
		const { paymentId, checkoutRequestId, accountId } = event.data;

		// allow time for provider response
		await step.sleep("wait-for-stk-response", "2m");

		// check if callback already resolved payment
		const currentStatus = await step.run("check-payment-status", async () => {
			const payload = await getPayload({ config });

			const result = await payload.find({
				collection: "payments",
				where: { checkoutRequestId: { equals: checkoutRequestId } },
				limit: 1,
			});

			const payment = result.docs[0];
			if (!payment) return null;

			return payment.status;
		});

		// exit if already handled
		if (!currentStatus || currentStatus !== "stk_sent") {
			return {
				outcome: "skipped",
				reason: `Payment status was already: ${currentStatus}`,
			};
		}

		// expire payment record
		await step.run("expire-payment-record", async () => {
			const payload = await getPayload({ config });

			await payload.update({
				collection: "payments",
				where: { checkoutRequestId: { equals: checkoutRequestId } },
				data: { status: "expired" },
			});
		});

		// reset verification status to allow retry
		await step.run("reset-verification-status", async () => {
			const payload = await getPayload({ config });

			const profileResult = await payload.find({
				collection: "wajakaziprofiles",
				where: { account: { equals: accountId } },
				limit: 1,
			});

			const profile = profileResult.docs[0];
			if (!profile) return;

			// only reset if still pending payment
			if (profile.verificationStatus !== "pending_payment") return;

			await payload.update({
				collection: "wajakaziprofiles",
				id: profile.id,
				data: { verificationStatus: "pending_payment" },
			});
		});

		// log expiration for audit
		await step.run("write-audit-log", async () => {
			const payload = await getPayload({ config });

			let account = null;

			try {
				account = await payload.findByID({
					collection: "accounts",
					id: accountId,
					overrideAccess: true,
				});
			} catch {
				// account may have been removed
			}

			const actorLabel = account
				? [account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
					account.email
				: accountId;

			await writeAuditLog({
				action: "payment_expired",
				actorId: account?.id ?? null,
				actorLabel,
				targetId: account?.id ?? null,
				targetLabel: actorLabel,
				metadata: {
					paymentId,
					checkoutRequestId,
					reason: "STK Push not responded to within 2 minutes",
				},
				source: "system",
			});
		});

		return {
			outcome: "expired",
			paymentId,
			checkoutRequestId,
		};
	},
);
