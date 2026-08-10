// src/app/apis/payments/callback/route.ts

import { writeAuditLog } from "@/lib/audit";
import { sendPaymentConfirmedEmail, sendSubscriptionActivatedEmail } from "@/lib/email";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

interface CallbackMetadataItem {
	Name: string;
	Value: string | number;
}

interface STKCallbackSuccess {
	MerchantRequestID: string;
	CheckoutRequestID: string;
	ResultCode: 0;
	ResultDesc: string;
	CallbackMetadata: { Item: CallbackMetadataItem[] };
}

interface STKCallbackFailure {
	MerchantRequestID: string;
	CheckoutRequestID: string;
	ResultCode: number;
	ResultDesc: string;
}

type STKCallback = STKCallbackSuccess | STKCallbackFailure;

interface SafaricomCallbackPayload {
	Body: { stkCallback: STKCallback };
}

const getMetadataValue = (
	items: CallbackMetadataItem[],
	name: string,
): string | number | undefined => items.find((i) => i.Name === name)?.Value;

export const POST = async (req: Request) => {
	const payload = await getPayload({ config });

	try {
		let body: SafaricomCallbackPayload;

		try {
			body = await req.json();
		} catch {
			console.error("[payments/callback] failed to parse request body");
			return NextResponse.json(
				{ ResultCode: 0, ResultDesc: "Accepted" },
				{ status: 200 },
			);
		}

		const stkCallback = body?.Body?.stkCallback;

		if (!stkCallback?.CheckoutRequestID) {
			console.error("[payments/callback] missing CheckoutRequestID", body);
			return NextResponse.json(
				{ ResultCode: 0, ResultDesc: "Accepted" },
				{ status: 200 },
			);
		}

		const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

		console.log(
			`[payments/callback] received — CheckoutRequestID: ${CheckoutRequestID}, ResultCode: ${ResultCode}`,
		);

		// check payments collection first — registration payments land here
		const paymentResult = await payload.find({
			collection: "payments",
			where: { checkoutRequestId: { equals: CheckoutRequestID } },
			overrideAccess: true,
			limit: 1,
		});

		if (paymentResult.docs.length > 0) {
			return await handleRegistrationCallback(
				payload,
				paymentResult.docs[0],
				stkCallback,
				CheckoutRequestID,
				ResultCode,
				ResultDesc,
			);
		}

		// no payment record — check subscriptions collection
		const subscriptionResult = await payload.find({
			collection: "subscriptions",
			where: { checkoutRequestId: { equals: CheckoutRequestID } },
			overrideAccess: true,
			limit: 1,
		});

		if (subscriptionResult.docs.length > 0) {
			return await handleSubscriptionCallback(
				payload,
				subscriptionResult.docs[0],
				stkCallback,
				CheckoutRequestID,
				ResultCode,
				ResultDesc,
			);
		}

		console.error(
			`[payments/callback] no record found for CheckoutRequestID: ${CheckoutRequestID}`,
		);
		return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
	} catch (error) {
		console.error("[payments/callback] unhandled error:", error);
		return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
	}
};

const handleRegistrationCallback = async (
	payload: Awaited<ReturnType<typeof getPayload>>,
	payment: any,
	stkCallback: STKCallback,
	CheckoutRequestID: string,
	ResultCode: number,
	ResultDesc: string,
) => {
	if (
		payment.status === "confirmed" ||
		payment.status === "failed" ||
		payment.status === "expired"
	) {
		console.log(`[payments/callback] registration already processed — skipping`);
		return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
	}

	const accountId =
		typeof payment.account === "object" ? payment.account.id : payment.account;

	const accountResult = await payload.findByID({
		collection: "accounts",
		id: accountId,
		overrideAccess: true,
	});

	const actorLabel = accountResult
		? [accountResult.firstName, accountResult.lastName]
				.filter(Boolean)
				.join(" ")
				.trim() || accountResult.email
		: accountId;

	if (ResultCode === 0) {
		const items = (stkCallback as STKCallbackSuccess).CallbackMetadata?.Item ?? [];
		const mpesaReceiptNumber = getMetadataValue(items, "MpesaReceiptNumber") as
			| string
			| undefined;

		await payload.update({
			collection: "payments",
			where: { checkoutRequestId: { equals: CheckoutRequestID } },
			data: {
				status: "confirmed",
				mpesaReceiptNumber: mpesaReceiptNumber ?? null,
				resultCode: String(ResultCode),
				resultDesc: ResultDesc,
			},
			overrideAccess: true,
		});

		await handleRegistrationConfirmed(
			payload,
			payment.account,
			mpesaReceiptNumber,
			payment.amount,
		);

		await writeAuditLog({
			action: "payment_confirmed",
			actorId: accountId,
			actorLabel,
			targetId: accountId,
			targetLabel: actorLabel,
			metadata: {
				paymentId: payment.id,
				paymentType: "registration",
				amount: payment.amount,
				currency: payment.currency,
				mpesaReceiptNumber: mpesaReceiptNumber ?? null,
				checkoutRequestId: CheckoutRequestID,
			},
			source: "system",
		});

		return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
	}

	await payload.update({
		collection: "payments",
		where: { checkoutRequestId: { equals: CheckoutRequestID } },
		data: {
			status: "failed",
			resultCode: String(ResultCode),
			resultDesc: ResultDesc,
		},
		overrideAccess: true,
	});

	await writeAuditLog({
		action: "payment_failed",
		actorId: accountId,
		actorLabel,
		targetId: accountId,
		targetLabel: actorLabel,
		metadata: {
			paymentId: payment.id,
			paymentType: "registration",
			amount: payment.amount,
			resultCode: String(ResultCode),
			resultDesc: ResultDesc,
			checkoutRequestId: CheckoutRequestID,
		},
		source: "system",
	});

	return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
};

const handleSubscriptionCallback = async (
	payload: Awaited<ReturnType<typeof getPayload>>,
	subscription: any,
	stkCallback: STKCallback,
	CheckoutRequestID: string,
	ResultCode: number,
	ResultDesc: string,
) => {
	if (
		subscription.status === "active" ||
		subscription.status === "failed" ||
		subscription.status === "expired"
	) {
		console.log(`[payments/callback] subscription already processed — skipping`);
		return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
	}

	const accountId =
		typeof subscription.account === "object"
			? subscription.account.id
			: subscription.account;

	const accountResult = await payload.findByID({
		collection: "accounts",
		id: accountId,
		overrideAccess: true,
	});

	const actorLabel = accountResult
		? [accountResult.firstName, accountResult.lastName]
				.filter(Boolean)
				.join(" ")
				.trim() || accountResult.email
		: accountId;

	if (ResultCode === 0) {
		const items = (stkCallback as STKCallbackSuccess).CallbackMetadata?.Item ?? [];
		const mpesaReceiptNumber = getMetadataValue(items, "MpesaReceiptNumber") as
			| string
			| undefined;

		const startDate = new Date();
		const durationDays =
			typeof subscription.durationDays === "number" ? subscription.durationDays : 14;
		const endDate = new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

		await payload.update({
			collection: "subscriptions",
			id: subscription.id,
			data: {
				status: "active",
				mpesaReceiptNumber: mpesaReceiptNumber ?? null,
				resultCode: String(ResultCode),
				resultDesc: ResultDesc,
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
			overrideAccess: true,
		});

		await activateMwajiriProfile(payload, accountId, {
			subscriptionId: subscription.id,
			tierName: subscription.tierName,
			endDate: endDate.toISOString(),
		});

		// send subscription activated email — non-fatal if it fails
		if (accountResult?.email) {
			try {
				await sendSubscriptionActivatedEmail({
					to: accountResult.email,
					firstName: accountResult.firstName ?? "there",
					tierName: subscription.tierName,
					endDate: endDate.toISOString(),
					mpesaReceiptNumber: mpesaReceiptNumber ?? "N/A",
					amount: subscription.amount,
				});
			} catch (emailError) {
				console.error(
					"[payments/callback] failed to send subscription email:",
					emailError,
				);
			}
		}

		await writeAuditLog({
			action: "payment_confirmed",
			actorId: accountId,
			actorLabel,
			targetId: accountId,
			targetLabel: actorLabel,
			metadata: {
				subscriptionId: subscription.id,
				paymentType: "subscription",
				tierId: subscription.tierId,
				tierName: subscription.tierName,
				amount: subscription.amount,
				currency: subscription.currency,
				mpesaReceiptNumber: mpesaReceiptNumber ?? null,
				checkoutRequestId: CheckoutRequestID,
			},
			source: "system",
		});

		return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
	}

	await payload.update({
		collection: "subscriptions",
		id: subscription.id,
		data: {
			status: "failed",
			resultCode: String(ResultCode),
			resultDesc: ResultDesc,
		},
		overrideAccess: true,
	});

	await resetMwajiriProfileToNone(payload, accountId);

	await writeAuditLog({
		action: "payment_failed",
		actorId: accountId,
		actorLabel,
		targetId: accountId,
		targetLabel: actorLabel,
		metadata: {
			subscriptionId: subscription.id,
			paymentType: "subscription",
			amount: subscription.amount,
			resultCode: String(ResultCode),
			resultDesc: ResultDesc,
			checkoutRequestId: CheckoutRequestID,
		},
		source: "system",
	});

	return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }, { status: 200 });
};

// advances mjakazi profile to pending_review and sends payment confirmed email
const handleRegistrationConfirmed = async (
	payload: Awaited<ReturnType<typeof getPayload>>,
	accountRef: string | { id: string } | null | undefined,
	mpesaReceiptNumber: string | undefined,
	amount: number,
) => {
	if (!accountRef) return;

	const accountId = typeof accountRef === "object" ? accountRef.id : accountRef;

	const profileResult = await payload.find({
		collection: "wajakaziprofiles",
		where: { account: { equals: accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const profile = profileResult.docs[0];
	if (!profile) return;

	if (profile.verificationStatus !== "pending_payment") {
		console.log(
			`[payments/callback] profile not in pending_payment — status: ${profile.verificationStatus}, skipping`,
		);
		return;
	}

	await payload.update({
		collection: "wajakaziprofiles",
		id: profile.id,
		data: {
			verificationStatus: "pending_review",
			verificationSubmittedAt: new Date().toISOString(),
		},
		overrideAccess: true,
	});

	// resolve account email and name for the notification
	const accountResult = await payload.findByID({
		collection: "accounts",
		id: accountId,
		overrideAccess: true,
	});

	// email is non-fatal — a failed send should never block profile advancement
	if (accountResult?.email && mpesaReceiptNumber) {
		try {
			await sendPaymentConfirmedEmail({
				to: accountResult.email,
				firstName: accountResult.firstName ?? "there",
				mpesaReceiptNumber,
				amount,
			});
		} catch (emailError) {
			console.error(
				"[payments/callback] failed to send payment confirmed email:",
				emailError,
			);
		}
	}

	console.log(
		`[payments/callback] mjakazi advanced to pending_review — account: ${accountId}`,
	);
};

const activateMwajiriProfile = async (
	payload: Awaited<ReturnType<typeof getPayload>>,
	accountId: string,
	data: { subscriptionId: string; tierName: string; endDate: string },
) => {
	const profileResult = await payload.find({
		collection: "waajiriprofiles",
		where: { account: { equals: accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const profile = profileResult.docs[0];
	if (!profile) return;

	await payload.update({
		collection: "waajiriprofiles",
		id: profile.id,
		data: {
			subscriptionStatus: "active",
			activeSubscription: data.subscriptionId,
			subscriptionEndDate: data.endDate,
			subscriptionTierName: data.tierName,
		},
		overrideAccess: true,
	});

	console.log(`[payments/callback] mwajiri profile activated — account: ${accountId}`);
};

const resetMwajiriProfileToNone = async (
	payload: Awaited<ReturnType<typeof getPayload>>,
	accountId: string,
) => {
	const profileResult = await payload.find({
		collection: "waajiriprofiles",
		where: { account: { equals: accountId } },
		overrideAccess: true,
		limit: 1,
	});

	const profile = profileResult.docs[0];
	if (!profile) return;

	await payload.update({
		collection: "waajiriprofiles",
		id: profile.id,
		data: { subscriptionStatus: "none" },
		overrideAccess: true,
	});
};
