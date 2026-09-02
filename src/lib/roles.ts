import type { User } from "@/payload-types";

type Role = NonNullable<User["role"]>;

// the complete set of roles. there is no neutral or default role in this project
const VALID_ROLES: readonly Role[] = ["admin", "staff", "mwajiri", "mjakazi"];

// the only roles a self-registering user may acquire — nothing a browser sends
// can produce admin or staff
const REGISTRATION_ROLES: readonly Role[] = ["mjakazi", "mwajiri"];

// the authenticated landing page for each role
const DASHBOARD_BY_ROLE: Record<Role, string> = {
	admin: "/dashboard/admin",
	staff: "/dashboard/staff",
	mwajiri: "/dashboard/mwajiri",
	mjakazi: "/dashboard/mjakazi",
};

const isValidRole = (value: unknown): value is Role =>
	typeof value === "string" && VALID_ROLES.includes(value as Role);

const isRegistrationRole = (value: unknown): value is Role =>
	typeof value === "string" && REGISTRATION_ROLES.includes(value as Role);

export {
	DASHBOARD_BY_ROLE,
	REGISTRATION_ROLES,
	VALID_ROLES,
	isRegistrationRole,
	isValidRole,
};
export type { Role };
