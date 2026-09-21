import { Info } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getPayload } from "payload";

import { getCurrentUser } from "@/components/admin/get-current-user";
import {
	DocumentVault,
	type DocumentNextStep,
} from "@/components/dashboard/mjakazi/document-vault";
import { normalizeDocumentSide } from "@/lib/vault";
import config from "@/payload-config";
import type { WajakaziProfile } from "@/payload-types";
import { getOwnProfile } from "@/services/profile.service";

export const metadata: Metadata = { title: "Documents" };

type DocumentInfo = {
	id: string;
	documentType: string;
	side: string;
	filename: string | null;
};

type VerificationState = NonNullable<WajakaziProfile["verificationState"]>;

// what the worker should do once every required slot is uploaded, keyed on the
// verification state so this page never points at a step that is not theirs to
// take. verified has its own banner below, and the terminal states have nothing
// left to do, so neither appears here
const NEXT_STEP_BY_VERIFICATION_STATE: Partial<
	Record<VerificationState, DocumentNextStep>
> = {
	draft: {
		href: "/dashboard/mjakazi/verification",
		label: "Submit for verification",
		description: "Submit your profile so our team can review your documents.",
	},
	pending_payment: {
		href: "/dashboard/mjakazi/verification",
		label: "Pay the verification fee",
		description: "Pay the fee to send your documents to our team for review.",
	},
	rejected: {
		href: "/dashboard/mjakazi/verification",
		label: "Resubmit for review",
		description: "Resubmit your profile so our team can review it again.",
	},
};

// the states whose next step re-enters review through the readiness rule, which
// requires a complete profile as well as a complete document set
const PROFILE_GATED_STATES: readonly VerificationState[] = ["draft", "rejected"];

const INCOMPLETE_PROFILE_NEXT_STEP: DocumentNextStep = {
	href: "/dashboard/mjakazi/profile",
	label: "Complete your profile",
	description:
		"Your documents are ready. Finish your profile so you can submit for verification.",
};

const getNextStep = (
	state: VerificationState,
	profileComplete: boolean,
): DocumentNextStep | null => {
	// "submit" and "resubmit" both run through the readiness rule, so they are
	// only offered once the profile is complete too — otherwise the worker is
	// sent to a page whose submit button is disabled. the profile is the step
	// that is actually outstanding
	if (!profileComplete && PROFILE_GATED_STATES.includes(state)) {
		return INCOMPLETE_PROFILE_NEXT_STEP;
	}
	return NEXT_STEP_BY_VERIFICATION_STATE[state] ?? null;
};

const MjakaziDocumentsPage = async () => {
	const user = await getCurrentUser();
	if (!user) redirect("/sign-in");

	const payload = await getPayload({ config });
	const profile = await getOwnProfile(payload, user);
	if (!profile) redirect("/dashboard/mjakazi");

	// an explicit select omits the upload's url (the private object path), so it
	// can never reach the client. documents are only opened through the audited
	// /api/actions/vault/{id} route
	const result = await payload.find({
		collection: "vault-documents",
		where: { profile: { equals: profile.id } },
		limit: 10,
		select: { id: true, documentType: true, side: true, filename: true },
		overrideAccess: false,
		req: { user },
	});

	const documents: DocumentInfo[] = result.docs.map((doc) => ({
		id: doc.id,
		documentType: doc.documentType,
		side: normalizeDocumentSide(doc.side),
		filename: doc.filename ?? null,
	}));

	// resolved from the state alone, never from the document list: this render
	// happens before the upload that completes the set, so completeness is
	// decided client-side where the live list lives
	const nextStep = getNextStep(
		profile.verificationState,
		profile.profileComplete === true,
	);

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="text-heading text-2xl font-semibold">My Documents</h1>
				<p className="text-muted-foreground mt-1 text-sm">
					Upload both sides of your National ID and your Certificate of Good Conduct so
					our team can verify you.
				</p>
			</div>

			{profile.verificationState === "verified" ? (
				<div className="bg-muted text-muted-foreground border-border flex items-start gap-2 rounded-lg border p-4 text-sm">
					<Info className="text-accent mt-0.5 size-4 shrink-0" />
					<p>
						You&apos;re verified. Any change to your documents will require
						re-verification and send your profile back to our team for review.
					</p>
				</div>
			) : null}

			{profile.verificationState === "pending_review" ? (
				<div className="bg-muted text-muted-foreground border-border flex items-start gap-2 rounded-lg border p-4 text-sm">
					<Info className="text-accent mt-0.5 size-4 shrink-0" />
					<p>
						Your documents are with our team for review. You&apos;ll be notified of the
						outcome, and your documents cannot be changed until then.
					</p>
				</div>
			) : null}

			<DocumentVault
				documents={documents}
				isVerified={profile.verificationState === "verified"}
				locked={profile.verificationState === "pending_review"}
				nextStep={nextStep}
			/>
		</div>
	);
};

export { MjakaziDocumentsPage as default };
