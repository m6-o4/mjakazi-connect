import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit";
import {
	initiateSTKPush,
	isValidKenyanMobileNumber,
	normaliseMpesaPhone,
} from "@/lib/mpesa";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// POST /apis/subscriptions/initiate
// triggers an M-Pesa STK push for a mwajiri subscription payment
// expects: { tierId, phoneNumber }
export const POST = async (req: Request) => {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
		}

		const payload = await getPayload({ config });
		const identity = await resolveIdentity(payload, userId);

		if (!identity) {
			return NextResponse.json({ error: "Identity not found" }, { status: 404 });
		}

		// subscription payments only apply to mwajiri accounts
		if (identity.role !== "mwajiri") {
			return NextResponse.json(
				{ error: "Only Mwajiri accounts can initiate subscriptions" },
				{ status: 403 },
			);
		}

		if (!identity.waajiriProfileId) {
			return NextResponse.json({ error: "Mwajiri profile not found" }, { status: 404 });
		}

		const body = await req.json();
		const { tierId, phoneNumber } = body;

		if (!tierId || !phoneNumber) {
			return NextResponse.json(
				{ error: "tierId and phoneNumber are required" },
				{ status: 400 },
			);
		}

		// read tiers live from platform settings so price and duration are always current
		const platformSettings = await payload.findGlobal({
			slug: "platform-settings",
			overrideAccess: true,
		});

		const tiers = platformSettings?.subscriptionTiers ?? [];
		const tier = (tiers as any[]).find((t) => t.tierId === tierId && t.isActive);

		if (!tier) {
			return NextResponse.json(
				{ error: "Selected tier is unavailable" },
				{ status: 404 },
			);
		}

		// prevent a new stk push if one is already in flight for this account
		const inflight = await payload.find({
			collection: "subscriptions",
			where: {
				and: [
					{ account: { equals: identity.accountId } },
					{ status: { equals: "stk_sent" } },
				],
			},
			overrideAccess: true,
			limit: 1,
		});

		if (inflight.totalDocs > 0) {
			return NextResponse.json(
				{ error: "A payment is already in progress. Please wait." },
				{ status: 409 },
			);
		}

		const normalised = normaliseMpesaPhone(phoneNumber);

		if (!isValidKenyanMobileNumber(normalised)) {
			return NextResponse.json(
				{ error: "Phone number must be a valid Kenyan mobile number" },
				{ status: 400 },
			);
		}

		const stkResponse = await initiateSTKPush({
			phoneNumber: normalised,
			amount: tier.price,
			accountReference: "MwaConnSub",
			transactionDesc: `Mjakazi Connect ${tier.name} Subscription`,
		});

		// create the subscription record before dispatching the inngest event
		// so the timeout handler always finds a record to act on
		const subscription = await payload.create({
			collection: "subscriptions",
			data: {
				account: identity.accountId,
				tierId: tier.tierId,
				tierName: tier.name,
				amount: tier.price,
				currency: "KES",
				status: "stk_sent",
				provider: "mpesa",
				phoneNumber: normalised,
				checkoutRequestId: stkResponse.CheckoutRequestID,
				merchantRequestId: stkResponse.MerchantRequestID,
				durationDays: tier.durationDays,
			},
			overrideAccess: true,
		});

		// mark the profile as pending so the dashboard reflects the in-flight state
		await payload.update({
			collection: "waajiriprofiles",
			id: identity.waajiriProfileId,
			data: { subscriptionStatus: "pending_payment" },
			overrideAccess: true,
		});

		// dispatch the 2-minute timeout — mirrors the registration payment pattern
		await inngest.send({
			name: "subscription/stk.sent",
			data: {
				subscriptionId: subscription.id,
				checkoutRequestId: stkResponse.CheckoutRequestID,
				accountId: identity.accountId,
				waajiriProfileId: identity.waajiriProfileId,
			},
		});

		// resolve account label for audit entry
		const accountQuery = await payload.find({
			collection: "accounts",
			where: { clerkId: { equals: userId } },
			overrideAccess: true,
			limit: 1,
		});

		const account = accountQuery.docs[0] ?? null;
		const actorLabel = account
			? [account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
				account.email
			: userId;

		await writeAuditLog({
			action: "payment_initiated",
			actorId: identity.accountId,
			actorLabel,
			targetId: identity.accountId,
			targetLabel: actorLabel,
			metadata: {
				subscriptionId: subscription.id,
				paymentType: "subscription",
				tierId: tier.tierId,
				tierName: tier.name,
				amount: tier.price,
				currency: "KES",
				phoneNumber: normalised,
				checkoutRequestId: stkResponse.CheckoutRequestID,
			},
			source: "user",
		});

		return NextResponse.json(
			{
				checkoutRequestId: stkResponse.CheckoutRequestID,
				merchantRequestId: stkResponse.MerchantRequestID,
				message: "STK Push sent. Please check your phone and enter your M-Pesa PIN.",
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("[subscriptions/initiate] error:", error);

		return NextResponse.json(
			{ error: "Subscription initiation failed. Please try again." },
			{ status: 500 },
		);
	}
};
