import { inngest } from "@/inngest/client";
import config from "@payload-config";
import { getPayload } from "payload";

export const verificationExpiry = inngest.createFunction(
	{ id: "verification-expiry-job", triggers: [{ cron: "0 2 * * *" }] },

	async ({ step }: { step: any }) => {
		const payload = await getPayload({ config });

		// fetch all verified profiles whose expiry has passed
		const expiredProfiles = await step.run("find-expired-profiles", async () => {
			const result = await payload.find({
				collection: "wajakaziprofiles",
				where: {
					and: [
						{ verificationStatus: { equals: "verified" } },
						{ verificationExpiry: { less_than_equal: new Date().toISOString() } },
					],
				},
				limit: 1000,
			});
			return result.docs.map((doc: any) => ({ id: doc.id }));
		});

		// update each expired profile individually for auditability
		for (const profile of expiredProfiles) {
			await step.run(`expire-profile-${profile.id}`, async () => {
				await payload.update({
					collection: "wajakaziprofiles",
					id: profile.id,
					data: { verificationStatus: "verification_expired" },
				});
			});
		}

		return {
			processed: expiredProfiles.length,
		};
	},
);
