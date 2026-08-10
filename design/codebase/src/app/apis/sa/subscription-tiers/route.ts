import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// only sa can read or modify subscription tiers
const assertSA = async () => {
	const { userId } = await auth();
	if (!userId) return null;

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);
	if (!identity || identity.role !== "sa") return null;

	return { payload, identity };
};

// returns the current tiers array from platform settings
export const GET = async () => {
	const ctx = await assertSA();
	if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

	const settings = await ctx.payload.findGlobal({
		slug: "platform-settings",
		overrideAccess: true,
	});

	return NextResponse.json({
		tiers: settings?.subscriptionTiers ?? [],
	});
};

// replaces the entire tiers array — client sends the full updated list
// this avoids partial update complexity since tier counts are small
export const PUT = async (req: Request) => {
	const ctx = await assertSA();
	if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

	const body = await req.json();
	const { tiers } = body;

	if (!Array.isArray(tiers)) {
		return NextResponse.json({ error: "tiers must be an array" }, { status: 400 });
	}

	// validate each tier has the minimum required fields before persisting
	for (const tier of tiers) {
		if (!tier.tierId || !tier.name || !tier.price || !tier.durationDays) {
			return NextResponse.json(
				{ error: "Each tier requires tierId, name, price, and durationDays" },
				{ status: 400 },
			);
		}

		if (tier.price < 1 || tier.durationDays < 1) {
			return NextResponse.json(
				{ error: "price and durationDays must be at least 1" },
				{ status: 400 },
			);
		}
	}

	// tierId must be unique across tiers — duplicate ids corrupt subscription records
	const tierIds = tiers.map((t: any) => t.tierId);
	if (new Set(tierIds).size !== tierIds.length) {
		return NextResponse.json(
			{ error: "Each tier must have a unique tierId" },
			{ status: 400 },
		);
	}

	const updated = await ctx.payload.updateGlobal({
		slug: "platform-settings",
		data: { subscriptionTiers: tiers },
		overrideAccess: true,
	});

	return NextResponse.json({
		tiers: updated.subscriptionTiers ?? [],
	});
};
