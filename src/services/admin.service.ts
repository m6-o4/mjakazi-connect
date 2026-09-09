import { subDays } from "date-fns";
import type { Payload } from "payload";

// admin dashboard aggregations. trusted reads for the admin overview — nothing
// is written, so no audit entry and no actor gate is needed (the page already
// requires the admin role before calling these).

const WINDOW_DAYS = 30;

type RevenueSplit = {
	verification: number;
	subscription: number;
	total: number;
};

type RevenueSnapshot = {
	allTime: RevenueSplit;
	last30Days: RevenueSplit;
};

type VerificationThroughput = {
	approved: number;
	rejected: number;
};

const emptySplit = (): RevenueSplit => ({
	verification: 0,
	subscription: 0,
	total: 0,
});

// sums confirmed payments, split by verification fees vs subscriptions. a
// confirmed payment is terminal and its amount is the revenue source of truth —
// every other status is ignored. the 30-day window is computed off confirmedAt,
// so a payment confirmed outside the window still counts in the all-time total.
const getRevenueSnapshot = async (payload: Payload): Promise<RevenueSnapshot> => {
	const allTime = emptySplit();
	const last30Days = emptySplit();
	const windowStart = subDays(new Date(), WINDOW_DAYS).getTime();

	try {
		const result = await payload.find({
			collection: "payments",
			where: { status: { equals: "confirmed" } },
			pagination: false,
			depth: 0,
			select: { amount: true, paymentType: true, confirmedAt: true },
			overrideAccess: true,
		});

		for (const payment of result.docs) {
			const amount = payment.amount ?? 0;
			const key = payment.paymentType === "subscription" ? "subscription" : "verification";

			allTime[key] += amount;
			allTime.total += amount;

			const confirmedAt = payment.confirmedAt
				? new Date(payment.confirmedAt).getTime()
				: 0;
			if (confirmedAt >= windowStart) {
				last30Days[key] += amount;
				last30Days.total += amount;
			}
		}
	} catch (error) {
		console.error("[services/admin] getRevenueSnapshot failed:", error);
	}

	return { allTime, last30Days };
};

// review decisions in the last 30 days, read from the audit trail so every
// approve/reject counts once even when one profile is reviewed several times.
const getVerificationThroughput = async (
	payload: Payload,
): Promise<VerificationThroughput> => {
	const throughput: VerificationThroughput = { approved: 0, rejected: 0 };

	try {
		const result = await payload.find({
			collection: "audit-logs",
			where: {
				action: { in: ["verification_approved", "verification_rejected"] },
				createdAt: {
					greater_than_equal: subDays(new Date(), WINDOW_DAYS).toISOString(),
				},
			},
			pagination: false,
			depth: 0,
			select: { action: true },
			overrideAccess: true,
		});

		for (const log of result.docs) {
			if (log.action === "verification_approved") throughput.approved += 1;
			else if (log.action === "verification_rejected") throughput.rejected += 1;
		}
	} catch (error) {
		console.error("[services/admin] getVerificationThroughput failed:", error);
	}

	return throughput;
};

export { getRevenueSnapshot, getVerificationThroughput };
export type { RevenueSnapshot, RevenueSplit, VerificationThroughput };
