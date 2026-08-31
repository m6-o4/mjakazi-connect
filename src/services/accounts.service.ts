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
	profileComplete: boolean;
	createdAt: string;
};

type WaajiriAccount = {
	userId: string;
	firstName: string;
	lastName: string;
	email: string;
	blacklistState: string;
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

// deletes a SaaS account, cascading through profile, documents and clerk. admin
// only — staff never delete
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

		if (target.role === "mjakazi") {
			const profileResult = await payload.find({
				collection: "wajakazi-profiles",
				where: { user: { equals: userId } },
				depth: 0,
				limit: 1,
				overrideAccess: false,
				req: { user: actor },
			});
			const profile = profileResult.docs[0];

			if (profile) {
				// identity documents are the most sensitive — remove them first
				await payload.delete({
					collection: "vault-documents",
					where: { profile: { equals: profile.id } },
					overrideAccess: true,
				});

				const photoId =
					typeof profile.photo === "string" ? profile.photo : profile.photo?.id;
				if (photoId) {
					await payload.delete({
						collection: "profile-photos",
						id: photoId,
						overrideAccess: false,
						req: { user: actor },
					});
				}

				await payload.delete({
					collection: "wajakazi-profiles",
					id: profile.id,
					overrideAccess: false,
					req: { user: actor },
				});
			}
		} else {
			const profileResult = await payload.find({
				collection: "waajiri-profiles",
				where: { user: { equals: userId } },
				depth: 0,
				limit: 1,
				overrideAccess: false,
				req: { user: actor },
			});
			const profile = profileResult.docs[0];

			if (profile) {
				await payload.delete({
					collection: "waajiri-profiles",
					id: profile.id,
					overrideAccess: false,
					req: { user: actor },
				});
			}
		}

		await payload.delete({
			collection: "users",
			id: userId,
			overrideAccess: false,
			req: { user: actor },
		});

		await writeAuditLog({
			action: "account_deleted",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: target.id,
			targetLabel: userLabel(target),
			metadata: { role: target.role, email: target.email },
		});

		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/accounts] deleteAccount failed:", error);
		return { success: false, error: "Could not delete the account." };
	}
};

export { deleteAccount, listWaajiriAccounts, listWajakaziAccounts, updateAccountName };
export type { WaajiriAccount, WajakaziAccount };
