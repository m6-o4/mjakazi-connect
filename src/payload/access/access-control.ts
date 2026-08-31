import type { Access, AccessArgs, FieldAccess, Where } from "payload";

import type { User } from "@/payload-types";

type Role = NonNullable<User["role"]>;
type MaybeUser = Pick<User, "role"> | null | undefined;

// narrower than Access: returns a plain boolean, never a Where filter.
// required for collection.admin, which has no document set to filter against
type BooleanAccess = (args: AccessArgs) => boolean;

// single source of truth for role checks. one role per user, so this is an
// equality test against the permitted set rather than an array intersection
const hasRole = (user: MaybeUser, ...roles: Role[]): boolean =>
	Boolean(user?.role && roles.includes(user.role));

// ---------------------------------------------------------------------------
// baseline gates
// ---------------------------------------------------------------------------

// gate for any action that requires a signed-in user, regardless of role
const isAuthenticated: BooleanAccess = ({ req: { user } }) => {
	return Boolean(user);
};

// escape hatch for resources that are intentionally world-readable
const isPublic: BooleanAccess = () => true;

// hard lock, typically paired with server actions or api routes that perform
// their own authorization, so the collection itself stays sealed.
// audit-logs uses this on create, update and delete
const isRestricted: BooleanAccess = () => false;

// ---------------------------------------------------------------------------
// staff gates
// ---------------------------------------------------------------------------

// top tier: destructive and platform-wide operations. pricing, staff management,
// blacklisting, reinstatement, deletion, state machine overrides.
// role changes are mirrored to Clerk, so this governs Payload-side writes only
const isAdmin: BooleanAccess = ({ req: { user } }) => {
	return hasRole(user, "admin");
};

// field-level variant of the admin gate. FieldAccess carries a different
// signature from Access and may only return a boolean, so the collection-level
// isAdmin cannot be reused on individual fields
const isAdminField: FieldAccess = ({ req: { user } }) => {
	return hasRole(user, "admin");
};

// back-office gate covering verification review, concierge cases, moderation and
// marketing content. also the rule that decides who may enter the admin panel
const isAdminOrStaff: BooleanAccess = ({ req: { user } }) => {
	return hasRole(user, "admin", "staff");
};

const isAdminOrStaffField: FieldAccess = ({ req: { user } }) => {
	return hasRole(user, "admin", "staff");
};

// ---------------------------------------------------------------------------
// saas role gates
// ---------------------------------------------------------------------------

const isMjakazi: BooleanAccess = ({ req: { user } }) => {
	return hasRole(user, "mjakazi");
};

const isMwajiri: BooleanAccess = ({ req: { user } }) => {
	return hasRole(user, "mwajiri");
};

// ---------------------------------------------------------------------------
// ownership gates
// ---------------------------------------------------------------------------

// users read gate: admin and staff see the full list (staff need name + email
// for the accounts screens); everyone else is scoped to their own record
const isAdminOrStaffOrSelf: Access = ({ req: { user } }) => {
	if (!user) return false;
	if (hasRole(user, "admin", "staff")) return true;
	return { id: { equals: user.id } };
};

// users update gate: admin may update anyone; staff may update SaaS accounts
// (mjakazi / mwajiri) but never back-office accounts; everyone else only
// themselves. the return type is widened to boolean | Where so the two distinct
// query shapes don't collapse into an incompatible union
const isAdminOrStaffOrSelfAccountEdit: Access = ({ req: { user } }): boolean | Where => {
	if (!user) return false;
	if (hasRole(user, "admin")) return true;
	if (hasRole(user, "staff")) return { role: { in: ["mjakazi", "mwajiri"] } };
	return { id: { equals: user.id } };
};

// factory for ownership-scoped collections. pass the relation field pointing
// back to the owning user, e.g. isAdminOrOwner("user"). replaces writing a
// near-identical function per collection as ownership fields multiply
const isAdminOrOwner =
	(ownerField: string): Access =>
	({ req: { user } }) => {
		if (!user) return false;
		if (hasRole(user, "admin", "staff")) return true;
		return { [ownerField]: { equals: user.id } };
	};

// ---------------------------------------------------------------------------
// content gates
// ---------------------------------------------------------------------------

// content gate: staff see drafts, everyone else sees published entries only.
// deliberately does not grant draft access to merely-authenticated users, since
// waajiri and wajakazi are authenticated but are not editors
const isAdminOrStaffOrPublished: Access = ({ req: { user } }) => {
	if (hasRole(user, "admin", "staff")) return true;
	return { _status: { equals: "published" } };
};

// ---------------------------------------------------------------------------
// directory gate
// ---------------------------------------------------------------------------

// a wajakazi profile is publicly visible only when verified AND available.
// any other combination means fully invisible, not partially — see the
// visibility rule in project-overview.md
const DIRECTORY_VISIBLE: Where = {
	and: [
		{ verificationState: { equals: "verified" } },
		{ availabilityStatus: { equals: "available" } },
	],
};

// read gate for wajakazi-profiles. staff see everything, an owner always sees
// their own draft profile, and everyone else — signed in or not — sees only what
// the directory is allowed to show.
//
// this returns a Where filter rather than a boolean, so it composes with
// payload's query layer instead of being applied after the fact. it is NOT a
// substitute for the contact-field protection in contact.service.ts: this decides
// which documents are visible, not which fields come back with them
const isDirectoryVisibleOrOwner: Access = ({ req: { user } }) => {
	if (hasRole(user, "admin", "staff")) return true;
	if (user) {
		return { or: [{ user: { equals: user.id } }, DIRECTORY_VISIBLE] };
	}
	return DIRECTORY_VISIBLE;
};

export {
	DIRECTORY_VISIBLE,
	isAdmin,
	isAdminField,
	isAdminOrOwner,
	isAdminOrStaffOrSelfAccountEdit,
	isAdminOrStaff,
	isAdminOrStaffField,
	isAdminOrStaffOrPublished,
	isAdminOrStaffOrSelf,
	isAuthenticated,
	isDirectoryVisibleOrOwner,
	isMjakazi,
	isMwajiri,
	isPublic,
	isRestricted,
};
