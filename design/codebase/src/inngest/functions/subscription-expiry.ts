import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit";
import config from "@payload-config";
import { getPayload } from "payload";

export const subscriptionExpiry = inngest.createFunction(
	{
		id: "subscription-expiry",
		name: "Subscription Expiry Check",
		// runs daily at midnight Nairobi time (UTC+3 = 21:00 UTC)
		triggers: [{ event: "inngest/scheduled.timer" }, { cron: "0 21 * * *" }],
	},
	async ({ step }) => {
		// find all subscriptions that are active but past their end date
		const expiredSubscriptions = await step.run(
			"find-expired-subscriptions",
			async () => {
				const payload = await getPayload({ config });

				const result = await payload.find({
					collection: "subscriptions",
					where: {
						and: [
							{ status: { equals: "active" } },
							// endDate is in the past
							{ endDate: { less_than: new Date().toISOString() } },
						],
					},
					overrideAccess: true,
					// process up to 100 per run — sufficient for current scale
					limit: 100,
				});

				return result.docs.map((sub) => ({
					id: sub.id,
					accountId:
						typeof sub.account === "object" ? (sub.account as any).id : sub.account,
					tierId: sub.tierId,
					tierName: sub.tierName,
					endDate: sub.endDate,
				}));
			},
		);

		if (expiredSubscriptions.length === 0) {
			return { outcome: "nothing_to_expire" };
		}

		// process each expired subscription individually so one failure
		// does not block the rest of the batch
		for (const subscription of expiredSubscriptions) {
			await step.run(`expire-subscription-${subscription.id}`, async () => {
				const payload = await getPayload({ config });

				// mark the subscription record expired
				await payload.update({
					collection: "subscriptions",
					id: subscription.id,
					data: { status: "expired" },
					overrideAccess: true,
				});

				// find and update the linked mwajiri profile
				const profileResult = await payload.find({
					collection: "waajiriprofiles",
					where: { account: { equals: subscription.accountId } },
					overrideAccess: true,
					limit: 1,
				});

				const profile = profileResult.docs[0];

				if (profile) {
					// only reset if this profile's active subscription matches —
					// guards against clobbering a newer subscription that activated
					// after this one expired
					const activeSubId =
						typeof profile.activeSubscription === "object"
							? (profile.activeSubscription as any).id
							: profile.activeSubscription;

					if (activeSubId === subscription.id) {
						await payload.update({
							collection: "waajiriprofiles",
							id: profile.id,
							data: {
								subscriptionStatus: "expired",
								activeSubscription: null,
								subscriptionEndDate: null,
								subscriptionTierName: null,
							},
							overrideAccess: true,
						});
					}
				}

				// resolve account label for the audit entry
				let account = null;

				try {
					account = await payload.findByID({
						collection: "accounts",
						id: subscription.accountId,
						overrideAccess: true,
					});
				} catch {
					// account may have been deleted
				}

				const actorLabel = account
					? [account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
						account.email
					: subscription.accountId;

				await writeAuditLog({
					action: "payment_expired",
					actorId: account?.id ?? null,
					actorLabel,
					targetId: account?.id ?? null,
					targetLabel: actorLabel,
					metadata: {
						subscriptionId: subscription.id,
						paymentType: "subscription",
						tierId: subscription.tierId,
						tierName: subscription.tierName,
						endDate: subscription.endDate,
						reason: "Subscription period elapsed",
					},
					source: "system",
				});
			});
		}

		return {
			outcome: "expired",
			count: expiredSubscriptions.length,
		};
	},
);
