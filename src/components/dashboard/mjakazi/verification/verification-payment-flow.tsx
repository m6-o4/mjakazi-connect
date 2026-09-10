"use client";

import { useEffect, useRef, useState } from "react";

import { PayVerification } from "@/components/dashboard/mjakazi/verification/pay-verification";
import { ResubmitVerification } from "@/components/dashboard/mjakazi/verification/resubmit-verification";
import {
	VerificationStateCard,
	type StatusState,
} from "@/components/dashboard/mjakazi/verification/verification-state";
import { PaymentSuccessNotice } from "@/components/dashboard/payments/payment-success-notice";
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
// detection has to live one level up. when a payment was awaiting confirmation
// and the state leaves pending_payment, the profile has just been paid for
const VerificationPaymentFlow = ({
	state,
	fee,
	phone,
	verificationExpiry,
	rejectionReason,
	freeResubmissionsRemaining,
}: VerificationPaymentFlowProps) => {
	const [awaiting, setAwaiting] = useState(false);
	const [justPaid, setJustPaid] = useState(false);
	const wasPendingRef = useRef(state === "pending_payment");

	useEffect(() => {
		if (wasPendingRef.current && state !== "pending_payment" && awaiting) {
			setJustPaid(true);
		}
		wasPendingRef.current = state === "pending_payment";
	}, [state, awaiting]);

	if (state === "pending_payment") {
		return <PayVerification fee={fee} phone={phone} onAwaitingChange={setAwaiting} />;
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
