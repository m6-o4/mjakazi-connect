import { inngest } from "@/inngest/client";
import { writeAuditLog } from "@/lib/audit";
import {
	initiateSTKPush,
	isValidKenyanMobileNumber,
	normaliseMpesaPhone,
} from "@/lib/mpesa";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// handles the initiation of m-pesa stk push payments for mjakazi registration fees
export const POST = async (req: Request) => {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
		}

		const payload = await getPayload({ config });

		// verify the account exists and is authorized to pay for registration
		const accountResult = await payload.find({
			collection: "accounts",
			where: { clerkId: { equals: userId } },
			limit: 1,
		});

		const account = accountResult.docs[0];

		if (!account) {
			return NextResponse.json({ error: "Account not found" }, { status: 404 });
		}

		if (account.role !== "mjakazi") {
			return NextResponse.json(
				{ error: "Only Mjakazi accounts can initiate registration payments" },
				{ status: 403 },
			);
		}

		// check that the profile is in the correct state to accept payment
		const profileResult = await payload.find({
			collection: "wajakaziprofiles",
			where: { account: { equals: account.id } },
			limit: 1,
		});

		const profile = profileResult.docs[0];

		if (!profile) {
			return NextResponse.json({ error: "Mjakazi profile not found" }, { status: 404 });
		}

		if (profile.verificationStatus !== "pending_payment") {
			return NextResponse.json(
				{ error: "Account is not in a payable state" },
				{ status: 409 },
			);
		}

		const platformSettings = await payload.findGlobal({
			slug: "platform-settings",
			overrideAccess: true,
		});

		const registrationFee = platformSettings?.registrationFee ?? 1500;

		const body = await req.json();
		const { phoneNumber } = body;

		if (!phoneNumber || typeof phoneNumber !== "string") {
			return NextResponse.json(
				{ error: "A valid M-Pesa phone number is required" },
				{ status: 400 },
			);
		}

		const normalised = normaliseMpesaPhone(phoneNumber);

		if (!isValidKenyanMobileNumber(normalised)) {
			return NextResponse.json(
				{ error: "Phone number must be a valid Kenyan mobile number" },
				{ status: 400 },
			);
		}

		// trigger the external stk push via the m-pesa provider
		const stkResponse = await initiateSTKPush({
			phoneNumber: normalised,
			amount: registrationFee,
			accountReference: "MjakaziReg",
			transactionDesc: "Mjakazi Connect Registration Fee",
		});

		// persist the payment intent to track the transaction status
		const payment = await payload.create({
			collection: "payments",
			data: {
				account: account.id,
				paymentType: "registration",
				amount: registrationFee,
				currency: "KES",
				provider: "mpesa",
				status: "stk_sent",
				phoneNumber: normalised,
				checkoutRequestId: stkResponse.CheckoutRequestID,
				merchantRequestId: stkResponse.MerchantRequestID,
			},
		});

		// schedule a timeout monitor to clean up if the callback is never received
		await inngest.send({
			name: "payment/stk.sent",
			data: {
				paymentId: payment.id,
				checkoutRequestId: stkResponse.CheckoutRequestID,
				accountId: account.id,
			},
		});

		const actorLabel =
			[account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
			account.email;

		await writeAuditLog({
			action: "payment_initiated",
			actorId: account.id,
			actorLabel,
			targetId: account.id,
			targetLabel: actorLabel,
			metadata: {
				paymentId: payment.id,
				paymentType: "registration",
				amount: registrationFee,
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
		console.error("[payments/initiate] error:", error);

		return NextResponse.json(
			{ error: "Payment initiation failed. Please try again." },
			{ status: 500 },
		);
	}
};
