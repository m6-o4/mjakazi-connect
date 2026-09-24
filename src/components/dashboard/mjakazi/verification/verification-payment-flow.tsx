"use client";

import { useEffect, useRef, useState } from "react";

import { PayVerification } from "@/components/dashboard/mjakazi/verification/pay-verification";
import { ResubmitVerification } from "@/components/dashboard/mjakazi/verification/resubmit-verification";
import {
	VerificationStateCard,
	type StatusState,
} from "@/components/dashboard/mjakazi/verification/verification-state";
import { PaymentSuccessNotice } from "@/components/dashboard/payments/payment-success-notice";
import { notifySuccess } from "@/lib/notify";
import type { WajakaziProfile } from "@/payload-types";

type VerificationState = NonNullable<WajakaziProfile["verificationState"]>;

type VerificationPaymentFlowProps = {
	state: VerificationState;
	fee: number | null;
	phone: string;
	verificationExpiry?: string | null;
	rejectionReason?: string | null;
	freeResubmissionsRemaining?: number | null;
};

// always-mounted wrapper for the non-draft verification states. it owns the
// success cue so it survives the pending_payment -> pending_review transition —
// PayVerification unmounts the moment the callback flips the state, so the
// detection has to live one level up. once this page has sent a push and the
// state then leaves pending_payment, the profile has just been paid for
const VerificationPaymentFlow = ({
	state,
	fee,
	phone,
	verificationExpiry,
	rejectionReason,
	freeResubmissionsRemaining,
}: VerificationPaymentFlowProps) => {
	// set the moment this page gets an stk push accepted, and never reset. it is
	// deliberately not the child's spinner state: a confirmation that landed
	// after the confirm window would then reach a parent with nothing to show,
	// losing even the notice that is meant to be the persistent record
	const [paymentInitiated, setPaymentInitiated] = useState(false);
	const [justPaid, setJustPaid] = useState(false);
	const wasPendingRef = useRef(state === "pending_payment");

	useEffect(() => {
		if (wasPendingRef.current && state !== "pending_payment" && paymentInitiated) {
			setJustPaid(true);
			// the inline notice is the persistent record; this toast is the
			// immediate cue the moment the callback lands. it fires once, on the
			// live transition — a later visit mounts with the state already past
			// pending_payment and no payment initiated here, so nothing re-fires
			if (state === "pending_review") {
				notifySuccess("Payment received", {
					id: "verification-payment-received",
					description:
						"Your verification fee is paid — our team is reviewing your documents.",
				});
			}
		}
		wasPendingRef.current = state === "pending_payment";
	}, [state, paymentInitiated]);

	if (state === "pending_payment") {
		return (
			<PayVerification
				fee={fee}
				phone={phone}
				onPaymentInitiated={() => setPaymentInitiated(true)}
			/>
		);
	}

	return (
		<>
			{justPaid && state === "pending_review" ? (
				<PaymentSuccessNotice
					title="Payment received"
					description="Your verification fee is paid. Your documents are now with our team for review."
				/>
			) : null}
			<VerificationStateCard
				state={state as StatusState}
				verificationExpiry={verificationExpiry}
				rejectionReason={rejectionReason}
				freeResubmissionsRemaining={freeResubmissionsRemaining}
			/>
			{state === "rejected" ? <ResubmitVerification /> : null}
		</>
	);
};

export { VerificationPaymentFlow };
