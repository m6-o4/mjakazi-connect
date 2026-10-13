import "dotenv/config";

import { getPayload } from "payload";

import { toId } from "@/lib/payload-helpers";
import config from "@/payload-config";

// one-off, idempotent backfill for the denormalized
// wajakazi-profiles.referralCount introduced with the off-platform referral
// feature. referral.service writes the count on publish/takedown; profiles whose
// referrals were published before that write path existed are corrected here.
// safe to run repeatedly. run with:
//   pnpm exec tsx scripts/backfill-referral-counts.ts
const run = async () => {
	const payload = await getPayload({ config });

	const published = await payload.find({
		collection: "referrals",
		where: { state: { equals: "published" } },
		pagination: false,
		depth: 0,
		overrideAccess: true,
	});

	const counts = new Map<string, number>();
	for (const referral of published.docs) {
		const mjakaziId = toId(referral.mjakazi);
		if (!mjakaziId) continue;
		counts.set(mjakaziId, (counts.get(mjakaziId) ?? 0) + 1);
	}

	let updated = 0;

	// set the true count for every profile that has published referrals
	for (const [mjakaziId, count] of counts) {
		await payload.update({
			collection: "wajakazi-profiles",
			id: mjakaziId,
			data: { referralCount: count },
			overrideAccess: true,
		});
		updated += 1;
	}

	// zero any profile whose stored count is now stale (a referral was removed)
	const stale = await payload.find({
		collection: "wajakazi-profiles",
		where: { referralCount: { greater_than: 0 } },
		pagination: false,
		depth: 0,
		select: { referralCount: true },
		overrideAccess: true,
	});
	for (const profile of stale.docs) {
		if (counts.has(String(profile.id))) continue;
		await payload.update({
			collection: "wajakazi-profiles",
			id: profile.id,
			data: { referralCount: 0 },
			overrideAccess: true,
		});
		updated += 1;
	}

	payload.logger.info(`[backfill-referral-counts] updated ${updated} profile(s)`);
	process.exit(0);
};

run().catch((error) => {
	console.error("[backfill-referral-counts] failed:", error);
	process.exit(1);
});
