import { randomUUID } from "crypto";
import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import type { User } from "@/payload-types";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type StaffRecord = {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	role: "admin" | "staff";
	createdAt: string;
};

type StaffInput = { firstName: string; lastName: string; email: string };

const userLabel = (user: User): string => {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return name || user.email;
};

// lists every back-office account (staff + admin). admin only — the server action
// guards the role before this runs
const listStaff = async (
	payload: Payload,
	actor: User,
): Promise<Result<StaffRecord[]>> => {
	if (actor.role !== "admin") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	try {
		const result = await payload.find({
			collection: "users",
			where: { role: { in: ["staff", "admin"] } },
			sort: "-createdAt",
			limit: 100,
			select: {
				id: true,
				firstName: true,
				lastName: true,
				email: true,
				role: true,
				createdAt: true,
			},
			overrideAccess: false,
			req: { user: actor },
		});

		const staff: StaffRecord[] = result.docs.map((user) => ({
			id: user.id,
			firstName: user.firstName,
			lastName: user.lastName,
			email: user.email,
			role: user.role === "admin" ? "admin" : "staff",
			createdAt: user.createdAt,
		}));

		return { success: true, data: staff };
	} catch (error) {
		console.error("[services/staff] listStaff failed:", error);
		return { success: false, error: "Could not load staff." };
	}
};

// creates a staff account. the temporary password is generated server-side and
// never leaves the server — the new staff member resets it on first sign-in
const createStaff = async (
	payload: Payload,
	actor: User,
	input: StaffInput,
): Promise<Result<StaffRecord>> => {
	if (actor.role !== "admin") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	const firstName = input.firstName.trim();
	const lastName = input.lastName.trim();
	const email = input.email.trim().toLowerCase();

	if (!firstName || !email) {
		return {
			success: false,
			error: "First name and email are required.",
			code: "invalid_input",
		};
	}

	try {
		const user = await payload.create({
			collection: "users",
			data: {
				firstName,
				lastName,
				email,
				password: `tmp-${randomUUID()}`,
				role: "staff",
				accountState: "active",
			},
			overrideAccess: false,
			req: { user: actor },
		});

		await writeAuditLog({
			action: "account_created",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: user.id,
			targetLabel: [firstName, lastName].filter(Boolean).join(" ").trim() || email,
			metadata: { role: "staff", email },
		});

		return {
			success: true,
			data: {
				id: user.id,
				firstName: user.firstName,
				lastName: user.lastName,
				email: user.email,
				role: "staff",
				createdAt: user.createdAt,
			},
		};
	} catch (error) {
		console.error("[services/staff] createStaff failed:", error);
		return { success: false, error: "Could not create the staff account." };
	}
};

// renames a staff member. email is locked after creation. admin only
const updateStaff = async (
	payload: Payload,
	actor: User,
	staffId: string,
	input: { firstName: string; lastName: string },
): Promise<Result> => {
	if (actor.role !== "admin") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	try {
		await payload.update({
			collection: "users",
			id: staffId,
			data: { firstName: input.firstName.trim(), lastName: input.lastName.trim() },
			overrideAccess: false,
			req: { user: actor },
		});

		await writeAuditLog({
			action: "account_updated",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: staffId,
			targetLabel: null,
			metadata: { role: "staff" },
		});

		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/staff] updateStaff failed:", error);
		return { success: false, error: "Could not update the staff account." };
	}
};

// deletes a staff account, cascading to clerk via the afterDelete hook. admin
// only, and never the admin's own account
const deleteStaff = async (
	payload: Payload,
	actor: User,
	staffId: string,
): Promise<Result> => {
	if (actor.role !== "admin") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}
	if (staffId === actor.id) {
		return {
			success: false,
			error: "You cannot delete your own account.",
			code: "self_delete",
		};
	}

	try {
		const target = await payload.findByID({
			collection: "users",
			id: staffId,
			overrideAccess: false,
			req: { user: actor },
		});

		if (!target) {
			return { success: false, error: "Account not found.", code: "not_found" };
		}
		if (target.role !== "staff" && target.role !== "admin") {
			return { success: false, error: "Not a staff account.", code: "invalid_target" };
		}

		await payload.delete({
			collection: "users",
			id: staffId,
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
		console.error("[services/staff] deleteStaff failed:", error);
		return { success: false, error: "Could not delete the staff account." };
	}
};

export { createStaff, deleteStaff, listStaff, updateStaff };
export type { StaffRecord };
