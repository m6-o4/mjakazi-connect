import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit";
import config from "@payload-config";
import { getPayload } from "payload";

// handle subscription stk push timeouts
export const subscriptionTimeout = inngest.createFunction(
	{
		id: "subscription-timeout",
		name: "Subscription STK Push Timeout",
		triggers: [{ event: "subscription/stk.sent" }],
	},
	async ({ event, step }) => {
		const { subscriptionId, checkoutRequestId, accountId, waajiriProfileId } = event.data;

		// give user time to respond to stk prompt
		await step.sleep("wait-for-stk-response", "2m");

		// re-fetch to see if callback already resolved the transaction
		const currentStatus = await step.run("check-subscription-status", async () => {
			const payload = await getPayload({ config });

			const result = await payload.find({
				collection: "subscriptions",
				where: { checkoutRequestId: { equals: checkoutRequestId } },
				overrideAccess: true,
				limit: 1,
			});

			const subscription = result.docs[0];
			if (!subscription) return null;

			return subscription.status;
		});

		// exit if already handled
		if (!currentStatus || currentStatus !== "stk_sent") {
			return {
				outcome: "skipped",
				reason: `Subscription status was already: ${currentStatus}`,
			};
		}

		// mark subscription as expired
		await step.run("expire-subscription-record", async () => {
			const payload = await getPayload({ config });

			await payload.update({
				collection: "subscriptions",
				where: { checkoutRequestId: { equals: checkoutRequestId } },
				data: { status: "expired" },
				overrideAccess: true,
			});
		});

		// reset profile if still pending
		await step.run("reset-profile-subscription-status", async () => {
			const payload = await getPayload({ config });

			const profileResult = await payload.find({
				collection: "waajiriprofiles",
				where: { account: { equals: accountId } },
				overrideAccess: true,
				limit: 1,
			});

			const profile = profileResult.docs[0];
			if (!profile) return;

			// skip if profile status changed
			if (profile.subscriptionStatus !== "pending_payment") return;

			await payload.update({
				collection: "waajiriprofiles",
				id: profile.id,
				data: { subscriptionStatus: "none" },
				overrideAccess: true,
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
				// account may have been deleted
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
					subscriptionId,
					checkoutRequestId,
					paymentType: "subscription",
					reason: "STK Push not responded to within 2 minutes",
				},
				source: "system",
			});
		});

		return {
			outcome: "expired",
			subscriptionId,
			checkoutRequestId,
		};
	},
);
