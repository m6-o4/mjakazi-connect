import type { User } from "@/payload-types";
import type { Access, AccessArgs } from "payload";

type IsAuthenticated = (args: AccessArgs<User>) => boolean;

// gate for any action that requires a signed-in user, regardless of role
const isAuthenticated: IsAuthenticated = ({ req: { user } }) => {
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
const isPublic: Access = () => true;

// hard lock — typically paired with server actions or api routes that perform
// their own authorization, so the collection itself stays sealed
const isRestricted: Access = () => false;

// reserved for the super-admin tier; used for destructive or platform-wide
// operations that even regular admins should not be able to perform
const isSA: Access = ({ req: { user } }) => {
	if (!user) return false;

	return (user as any)?.role === "sa";
};

// staff-level gate covering both admin and super-admin
// intentionally omits an owner fallback — collections like payments enforce
// row-level ownership at the api layer to avoid leaking filters via find queries
const isAdminOrSA: Access = ({ req: { user } }) => {
	if (!user) return false;

	const role = (user as any)?.role;

	return role === "admin" || role === "sa";
};

// accounts are keyed by clerkId rather than the payload document id, so
// ownership is resolved against the external auth identifier
const isAdminOrAccountOwner: Access = ({ req: { user } }) => {
	if (!user) return false;

	const role = (user as any)?.role;

	if (role === "admin" || role === "sa") return true;

	const clerkId = (user as any)?.clerkId;

	return { clerkId: { equals: clerkId } };
};

// profiles link back to their owning account document; staff bypass the filter,
// everyone else is scoped to rows they own via the account relation
const isAdminOrProfileOwner: Access = ({ req: { user } }) => {
	if (!user) return false;

	const role = (user as any)?.role;

	if (role === "admin" || role === "sa") return true;

	const id = (user as any)?.id;

	return { account: { equals: id } };
};

// vault entries track their uploader; only the original uploader or staff may
// access them, preventing cross-tenant exposure of private files
const isAdminOrVaultOwner: Access = ({ req: { user } }) => {
	if (!user) return false;

	const role = (user as any)?.role;

	if (role === "admin" || role === "sa") return true;

	const id = (user as any)?.id;

	return { uploadedBy: { equals: id } };
};

export {
	isAdminOrAccountOwner,
	isAdminOrProfileOwner,
	isAdminOrSA,
	isAdminOrVaultOwner,
	isAuthenticated,
	isAuthenticatedOrPublished,
	isPublic,
	isRestricted,
	isSA,
};
