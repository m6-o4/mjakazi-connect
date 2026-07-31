import type { User } from "@/payload-types";
import type { Access, AccessArgs, FieldAccess } from "payload";

type Role = NonNullable<User["role"]>;
type MaybeUser = Pick<User, "role"> | null | undefined;

// narrower than Access: returns a plain boolean, never a Where filter.
// required for collection.admin, which has no document set to filter against
type BooleanAccess = (args: AccessArgs) => boolean;

// single source of truth for role checks. one role per user, so this is an
// equality test against the permitted set rather than an array intersection
const hasRole = (user: MaybeUser, ...roles: Role[]): boolean =>
	Boolean(user?.role && roles.includes(user.role));

// gate for any action that requires a signed-in user, regardless of role
const isAuthenticated: BooleanAccess = ({ req: { user } }) => {
	return Boolean(user);
};

// used on content collections where guests should only see published entries
// while authenticated users (editors, previews) can see drafts as well
const isAuthenticatedOrPublished: Access = ({ req: { user } }) => {
	if (user) {
		return true;
	}
	return { _status: { equals: "published" } };
};

// escape hatch for resources that are intentionally world-readable
const isPublic: BooleanAccess = () => true;

// hard lock, typically paired with server actions or api routes that perform
// their own authorization, so the collection itself stays sealed
const isRestricted: BooleanAccess = () => false;

// top tier in this template; destructive and platform-wide operations.
// role changes are written to Clerk, so this governs Payload-side writes only
const isAdmin: BooleanAccess = ({ req: { user } }) => {
	return hasRole(user, "admin");
};

// staff-level gate covering content management; mirrors the rule that decides
// who may enter the admin panel at all
const isAdminOrEditor: BooleanAccess = ({ req: { user } }) => {
	return hasRole(user, "admin", "editor");
};

// users collection gate: only admins see the full list, everyone else including
// editors is scoped to their own record. editors retain admin-panel entry via
// isAdminOrEditor, they simply have no business reading other people's accounts
const isAdminOrSelf: Access = ({ req: { user } }) => {
	if (!user) return false;
	if (hasRole(user, "admin")) return true;
	return { id: { equals: user.id } };
};

// field-level variant of the admin gate. FieldAccess carries a different
// signature from Access and may only return a boolean, so the collection-level
// isAdmin cannot be reused on individual fields
const isAdminField: FieldAccess = ({ req: { user } }) => {
	return hasRole(user, "admin");
};

// factory for ownership-scoped collections. pass the relation field pointing
// back to the owning user, e.g. isAdminOrOwner("createdBy"). replaces writing a
// near-identical function per collection as ownership fields multiply
const isAdminOrOwner =
	(ownerField: string): Access =>
	({ req: { user } }) => {
		if (!user) return false;
		if (hasRole(user, "admin", "editor")) return true;
		return { [ownerField]: { equals: user.id } };
	};

// content gate: staff see drafts, everyone else sees published entries only.
// note this deliberately does not grant draft access to merely-authenticated
// users, since the user role belongs to saas customers, not editors
const isAdminOrEditorOrPublished: Access = ({ req: { user } }) => {
	if (hasRole(user, "admin", "editor")) return true;
	return { _status: { equals: "published" } };
};

export {
	isAdmin,
	isAdminField,
	isAdminOrEditor,
	isAdminOrEditorOrPublished,
	isAdminOrOwner,
	isAdminOrSelf,
	isAuthenticated,
	isAuthenticatedOrPublished,
	isPublic,
	isRestricted,
};
