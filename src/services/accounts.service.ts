import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import type { User } from "@/payload-types";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type WajakaziAccount = {
	userId: string;
	firstName: string;
	lastName: string;
	displayName: string;
	email: string;
	verificationState: string;
	accountState: string;
	profileComplete: boolean;
	createdAt: string;
};

type WaajiriAccount = {
	userId: string;
	firstName: string;
	lastName: string;
	email: string;
	blacklistState: string;
	accountState: string;
	createdAt: string;
};

// a populated relationship comes back as an object at depth > 0, but a raw id
// string otherwise. all three shapes are normalized here
type UserRelation = string | User | null | undefined;

const isBackOffice = (user: User): boolean =>
	user.role === "admin" || user.role === "staff";

const userLabel = (user: User): string => {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return name || user.email;
};

const relationId = (rel: UserRelation): string | null => {
	if (!rel) return null;
	if (typeof rel === "string") return rel;
	return rel.id ?? null;
};

const relationEmail = (rel: UserRelation): string => {
	if (rel && typeof rel === "object") return rel.email;
	return "";
};

const relationFirstName = (rel: UserRelation): string =>
	rel && typeof rel === "object" ? rel.firstName : "";

const relationLastName = (rel: UserRelation): string =>
	rel && typeof rel === "object" ? rel.lastName : "";

const relationAccountState = (rel: UserRelation): string =>
	rel && typeof rel === "object" ? rel.accountState : "active";

// lists all mjakazi accounts (name + email + verification state). admin + staff
const listWajakaziAccounts = async (
	payload: Payload,
	actor: User,
): Promise<Result<WajakaziAccount[]>> => {
	if (!isBackOffice(actor)) {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	try {
		const result = await payload.find({
			collection: "wajakazi-profiles",
			depth: 1,
			sort: "-createdAt",
			limit: 100,
			overrideAccess: false,
			req: { user: actor },
		});

		const accounts: WajakaziAccount[] = result.docs.map((profile) => ({
			userId: relationId(profile.user) ?? "",
			firstName: relationFirstName(profile.user),
			lastName: relationLastName(profile.user),
			displayName: profile.displayName,
			email: relationEmail(profile.user),
			verificationState: profile.verificationState,
			accountState: relationAccountState(profile.user),
			profileComplete: profile.profileComplete ?? false,
			createdAt: profile.createdAt,
		}));

		return { success: true, data: accounts };
	} catch (error) {
		console.error("[services/accounts] listWajakaziAccounts failed:", error);
		return { success: false, error: "Could not load accounts." };
	}
};

// lists all mwajiri accounts (name + email + blacklist state). admin + staff
const listWaajiriAccounts = async (
	payload: Payload,
	actor: User,
): Promise<Result<WaajiriAccount[]>> => {
	if (!isBackOffice(actor)) {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	try {
		const result = await payload.find({
			collection: "waajiri-profiles",
			depth: 1,
			sort: "-createdAt",
			limit: 100,
			overrideAccess: false,
			req: { user: actor },
		});

		const accounts: WaajiriAccount[] = result.docs.map((profile) => ({
			userId: relationId(profile.user) ?? "",
			firstName: relationFirstName(profile.user),
			lastName: relationLastName(profile.user),
			email: relationEmail(profile.user),
			blacklistState: profile.blacklistState,
			accountState: relationAccountState(profile.user),
			createdAt: profile.createdAt,
		}));

		return { success: true, data: accounts };
	} catch (error) {
		console.error("[services/accounts] listWaajiriAccounts failed:", error);
		return { success: false, error: "Could not load accounts." };
	}
};

// renames a SaaS account. admin + staff, but never a back-office account. email
// is locked after creation, so only the name is editable
const updateAccountName = async (
	payload: Payload,
	actor: User,
	userId: string,
	input: { firstName: string; lastName: string },
): Promise<Result> => {
	if (!isBackOffice(actor)) {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	try {
		const target = await payload.findByID({
			collection: "users",
			id: userId,
			overrideAccess: false,
			req: { user: actor },
		});

		if (!target) {
			return { success: false, error: "Account not found.", code: "not_found" };
		}
		if (target.role !== "mjakazi" && target.role !== "mwajiri") {
			return { success: false, error: "Not a SaaS account.", code: "invalid_target" };
		}

		await payload.update({
			collection: "users",
			id: userId,
			data: { firstName: input.firstName.trim(), lastName: input.lastName.trim() },
			overrideAccess: false,
			req: { user: actor },
		});

		await writeAuditLog({
			action: "account_updated",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: target.id,
			targetLabel: userLabel(target),
			metadata: { role: target.role },
		});

		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/accounts] updateAccountName failed:", error);
		return { success: false, error: "Could not update the account." };
	}
};

const deleteMjakaziAccountData = async (
	payload: Payload,
	user: User,
): Promise<string[]> => {
	const profileResult = await payload.find({
		collection: "wajakazi-profiles",
		where: { user: { equals: user.id } },
		depth: 0,
		limit: 1,
		overrideAccess: true,
	});
	const profile = profileResult.docs[0];

	if (profile) {
		// interaction records reference the profile — remove them before it, so
		// nothing is left pointing at a deleted document
		const mjakaziWhere = { mjakazi: { equals: profile.id } };
		await Promise.all([
			payload.delete({
				collection: "contact-unlocks",
				where: mjakaziWhere,
				overrideAccess: true,
			}),
			payload.delete({
				collection: "expressions-of-interest",
				where: mjakaziWhere,
				overrideAccess: true,
			}),
			payload.delete({
				collection: "hires",
				where: mjakaziWhere,
				overrideAccess: true,
			}),
			payload.delete({
				collection: "reviews",
				where: mjakaziWhere,
				overrideAccess: true,
			}),
			payload.delete({
				collection: "saved-wajakazi",
				where: mjakaziWhere,
				overrideAccess: true,
			}),
		]);

		// a shortlist row points at the profile directly, so pull those rows out of
		// every concierge case rather than leaving a dangling candidate. the query
		// is paged because each update removes the candidate, so the next find
		// returns the next page, and updates run sequentially so one deletion never
		// fires an unbounded burst of writes
		let shortlistPass = 0;
		const MAX_SHORTLIST_PASSES = 1000;
		while (shortlistPass < MAX_SHORTLIST_PASSES) {
			const cases = await payload.find({
				collection: "concierge-cases",
				where: { "shortlist.candidate": { equals: profile.id } },
				depth: 0,
				limit: 50,
				overrideAccess: true,
			});
			if (cases.docs.length === 0) break;

			for (const conciergeCase of cases.docs) {
				const shortlist = (conciergeCase.shortlist ?? []).filter((row) => {
					const candidateId =
						typeof row.candidate === "string" ? row.candidate : row.candidate?.id;
					return candidateId !== profile.id;
				});
				await payload.update({
					collection: "concierge-cases",
					id: conciergeCase.id,
					data: { shortlist },
					overrideAccess: true,
				});
			}

			shortlistPass += 1;
		}

		if (shortlistPass >= MAX_SHORTLIST_PASSES) {
			console.error(
				"[services/accounts] shortlist cleanup hit its pass cap for profile:",
				profile.id,
			);
		}

		// identity documents are the most sensitive — remove them first
		await payload.delete({
			collection: "vault-documents",
			where: { profile: { equals: profile.id } },
			overrideAccess: true,
		});
	}

	// every photo the account uploaded, not just the current one
	const photoResult = await payload.find({
		collection: "profile-photos",
		where: { user: { equals: user.id } },
		limit: 100,
		overrideAccess: true,
	});
	await Promise.all(
		photoResult.docs.map((photo) =>
			payload.delete({
				collection: "profile-photos",
				id: photo.id,
				overrideAccess: true,
			}),
		),
	);

	if (profile) {
		await payload.delete({
			collection: "wajakazi-profiles",
			id: profile.id,
			overrideAccess: true,
		});
	}

	// deleting a worker releases no one else — their own availability goes with
	// the profile
	return [];
};

const deleteMwajiriAccountData = async (
	payload: Payload,
	user: User,
): Promise<string[]> => {
	const mwajiriWhere = { mwajiri: { equals: user.id } };

	// workers held by this employer's active hires, captured before the hire rows
	// go — deleting a hire directly bypasses hire.service's own availability reset
	const activeHires = await payload.find({
		collection: "hires",
		where: {
			mwajiri: { equals: user.id },
			state: { in: ["pending_agreement", "agreed"] },
		},
		depth: 0,
		limit: 500,
		overrideAccess: true,
	});
	const hiredProfileIds = [
		...new Set(
			activeHires.docs
				.map((hire) =>
					typeof hire.mjakazi === "string" ? hire.mjakazi : hire.mjakazi?.id,
				)
				.filter((id): id is string => Boolean(id)),
		),
	];

	// concierge cases reference the subscription, so they go before it
	await payload.delete({
		collection: "concierge-cases",
		where: mwajiriWhere,
		overrideAccess: true,
	});

	await Promise.all([
		payload.delete({
			collection: "contact-unlocks",
			where: mwajiriWhere,
			overrideAccess: true,
		}),
		payload.delete({
			collection: "expressions-of-interest",
			where: mwajiriWhere,
			overrideAccess: true,
		}),
		payload.delete({
			collection: "hires",
			where: mwajiriWhere,
			overrideAccess: true,
		}),
		payload.delete({
			collection: "reviews",
			where: mwajiriWhere,
			overrideAccess: true,
		}),
		payload.delete({
			collection: "saved-wajakazi",
			where: { user: { equals: user.id } },
			overrideAccess: true,
		}),
	]);

	// release any worker this employer was holding, but only when no other active
	// hire still holds them — otherwise we would put a worker back in the
	// directory while another employer's hire is still live
	const releasedProfileIds: string[] = [];
	for (const profileId of hiredProfileIds) {
		const remaining = await payload.count({
			collection: "hires",
			where: {
				mjakazi: { equals: profileId },
				state: { in: ["pending_agreement", "agreed"] },
			},
			overrideAccess: true,
		});
		if (remaining.totalDocs === 0) {
			await payload.update({
				collection: "wajakazi-profiles",
				id: profileId,
				data: { availabilityStatus: "available" },
				overrideAccess: true,
			});
			releasedProfileIds.push(profileId);
		}
	}

	const subscriptionResult = await payload.find({
		collection: "subscriptions",
		where: { user: { equals: user.id } },
		limit: 10,
		overrideAccess: true,
	});
	await Promise.all(
		subscriptionResult.docs.map((sub) =>
			payload.delete({
				collection: "subscriptions",
				id: sub.id,
				overrideAccess: true,
			}),
		),
	);

	const profileResult = await payload.find({
		collection: "waajiri-profiles",
		where: { user: { equals: user.id } },
		depth: 0,
		limit: 1,
		overrideAccess: true,
	});
	const profile = profileResult.docs[0];
	if (profile) {
		await payload.delete({
			collection: "waajiri-profiles",
			id: profile.id,
			overrideAccess: true,
		});
	}

	return releasedProfileIds;
};

// removes every record owned by a SaaS account — profile, identity documents,
// photos, subscription, payments and the interaction records that reference the
// account (unlocks, expressions of interest, hires, reviews, saved profiles,
// concierge cases) — so deletion leaves no dangling relations. audit logs are
// deliberately kept: they are the immutable operational record. the caller has
// already authorized the deletion (admin, or the account owner)
const deleteAccountData = async (payload: Payload, user: User): Promise<string[]> => {
	const releasedProfileIds =
		user.role === "mjakazi"
			? await deleteMjakaziAccountData(payload, user)
			: await deleteMwajiriAccountData(payload, user);

	const paymentResult = await payload.find({
		collection: "payments",
		where: { user: { equals: user.id } },
		limit: 100,
		overrideAccess: true,
	});
	await Promise.all(
		paymentResult.docs.map((payment) =>
			payload.delete({
				collection: "payments",
				id: payment.id,
				overrideAccess: true,
			}),
		),
	);

	return releasedProfileIds;
};

// deletes a SaaS account, cascading through profile, documents, interactions and
// clerk. admin only — staff never delete. no reason is required: deletion lives
// in the account sections, deliberately separate from moderation
// (suspend/reinstate), which stays reason-gated
const deleteAccount = async (
	payload: Payload,
	actor: User,
	userId: string,
): Promise<Result> => {
	if (actor.role !== "admin") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	try {
		const target = await payload.findByID({
			collection: "users",
			id: userId,
			overrideAccess: false,
			req: { user: actor },
		});

		if (!target) {
			return { success: false, error: "Account not found.", code: "not_found" };
		}
		if (target.role !== "mjakazi" && target.role !== "mwajiri") {
			return { success: false, error: "Not a SaaS account.", code: "invalid_target" };
		}

		const releasedProfileIds = await deleteAccountData(payload, target);

		await writeAuditLog({
			action: "account_deleted",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: target.id,
			targetLabel: userLabel(target),
			metadata: {
				role: target.role,
				email: target.email,
				releasedMjakazi: releasedProfileIds,
			},
		});

		await payload.delete({
			collection: "users",
			id: userId,
			overrideAccess: true,
		});

		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/accounts] deleteAccount failed:", error);

		// the cascade is not transactional, so a failure can leave a partially
		// erased account. record it so the partial state is visible and the
		// deletion can be re-run to completion
		await writeAuditLog({
			action: "account_deletion_failed",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: userId,
			targetLabel: null,
			metadata: { error: error instanceof Error ? error.message : "unknown error" },
		});

		return {
			success: false,
			error: "Deletion did not finish. Re-run it to complete the cleanup.",
		};
	}
};

// lets a mjakazi or mwajiri delete their own account and all associated data.
// the audit entry is written before the user record is removed so the actor id
// is still resolvable; deleting the user then triggers the deleteClerkUser hook
const deleteOwnAccount = async (payload: Payload, user: User): Promise<Result> => {
	if (user.role !== "mjakazi" && user.role !== "mwajiri") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	const label = userLabel(user);

	try {
		await deleteAccountData(payload, user);

		await writeAuditLog({
			action: "account_deleted",
			actorId: user.id,
			actorLabel: label,
			targetId: user.id,
			targetLabel: label,
			metadata: { role: user.role, email: user.email, selfDeleted: true },
			source: "user",
		});

		await payload.delete({
			collection: "users",
			id: user.id,
			overrideAccess: true,
		});

		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/accounts] deleteOwnAccount failed:", error);
		return { success: false, error: "Could not delete your account." };
	}
};

export {
	deleteAccount,
	deleteOwnAccount,
	listWaajiriAccounts,
	listWajakaziAccounts,
	updateAccountName,
};
export type { WaajiriAccount, WajakaziAccount };
