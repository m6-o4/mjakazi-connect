import type { Metadata } from "next";
import { getPayload } from "payload";

import { ReferrerForm } from "@/components/web/reference/referrer-form";
import config from "@/payload-config";
import { getReferralByToken } from "@/services/referral.service";

// the page reflects live invite state (used, expired), so it must never be
// cached, and it must never be indexed — the token is the only way in
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
	title: "Give a referral",
	robots: { index: false, follow: false },
};

const ReferralPage = async ({ params }: { params: Promise<{ token: string }> }) => {
	const { token } = await params;

	const payload = await getPayload({ config });
	const invite = await getReferralByToken(payload, token);

	if (!invite) {
		return (
			<div className="flex min-h-screen items-center justify-center px-4 pt-28 pb-16">
				<div className="w-full max-w-xl text-center">
					<h1 className="text-heading text-2xl font-semibold">
						This link is no longer available
					</h1>
					<p className="text-muted-foreground mt-2 text-sm">
						This referral link is invalid, has already been used, or has expired. If you
						think this is a mistake, ask the person who invited you to send a new one.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="flex min-h-screen items-center justify-center px-4 pt-28 pb-16">
			<div className="w-full max-w-2xl">
				<ReferrerForm invite={invite} token={token} />
			</div>
		</div>
	);
};

export { ReferralPage as default };
