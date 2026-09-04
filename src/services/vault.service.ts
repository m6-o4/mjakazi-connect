import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import { documentTypeSchema } from "@/lib/vault";
import type { User, VaultDocument } from "@/payload-types";
import { getOwnProfile } from "@/services/profile.service";
import { revertToReview } from "@/services/verification.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type UploadFile = { data: Buffer; mimetype: string; name: string; size: number };

// relationships come back as an id string at depth 0, and as an object when
// populated. both are normalized to an id here
const toId = (
	value: string | { id?: string | number } | null | undefined,
): string | null => {
	if (!value) return null;
	if (typeof value === "string") return value;
	return typeof value.id === "number" ? String(value.id) : (value.id ?? null);
};

// the actor/target label is a name snapshot so the log stays readable after an
// account is renamed or deleted
const userLabel = (user: User): string => {
	const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
	return name || user.email;
};

// uploads (or replaces) one of the two identity documents. a mjakazi has at most
// one document per type: uploading the same type replaces it. the new file is
// created first, then the old one is deleted, so a failed upload never leaves the
// profile without a document
const uploadVaultDocument = async (
	payload: Payload,
	user: User,
	input: { documentType: string; file: UploadFile },
): Promise<Result<{ document: VaultDocument; replaced: boolean }>> => {
	if (user.role !== "mjakazi") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	const parsedType = documentTypeSchema.safeParse(input.documentType);
	if (!parsedType.success) {
		return { success: false, error: "Invalid document type.", code: "invalid_type" };
	}
	const documentType = parsedType.data;

	const profile = await getOwnProfile(payload, user);
	if (!profile) {
		return { success: false, error: "Profile not found.", code: "not_found" };
	}

	// documents lock once verification is in review so the evidence staff are
	// looking at cannot change under them. the lock is enforced here, not in the
	// UI, so no edit path can bypass it
	if (profile.verificationState === "pending_review") {
		return {
			success: false,
			error: "Documents are locked while your verification is under review.",
			code: "documents_locked",
		};
	}
	const wasVerified = profile.verificationState === "verified";

	try {
		// read access scopes this to the owner, so only their own existing document
		// of the same type is found
		const existing = await payload.find({
			collection: "vault-documents",
			where: {
				and: [
					{ profile: { equals: profile.id } },
					{ documentType: { equals: documentType } },
				],
			},
			limit: 1,
			overrideAccess: false,
			req: { user },
		});
		const previousId = existing.docs[0]?.id ?? null;

		// create is sealed (isRestricted), so this is a trusted write after the
		// role + ownership checks above
		const document = await payload.create({
			collection: "vault-documents",
			data: {
				profile: profile.id,
				uploadedBy: user.id,
				documentType,
			},
			file: input.file,
			overrideAccess: true,
		});

		// remove the previous version so storage does not accumulate orphans. a
		// failed deletion must not block the successful upload
		if (previousId && previousId !== document.id) {
			try {
				await payload.delete({
					collection: "vault-documents",
					id: previousId,
					overrideAccess: true,
				});
			} catch (error) {
				console.warn("[services/vault] could not delete previous document:", error);
			}
		}

		await writeAuditLog({
			action: "document_uploaded",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: user.id,
			targetLabel: userLabel(user),
			metadata: { documentType, profileId: profile.id, replaced: Boolean(previousId) },
		});

		// a verified worker's documents are the reviewed evidence — replacing one
		// sends the profile back for a free re-review
		if (wasVerified) {
			const reverted = await revertToReview(payload, profile.id);
			if (!reverted.success) {
				console.warn("[services/vault] reverification trigger failed:", reverted.error);
			}
		}

		return { success: true, data: { document, replaced: Boolean(previousId) } };
	} catch (error) {
		console.error("[services/vault] uploadVaultDocument failed:", error);
		return { success: false, error: "Could not upload the document." };
	}
};

// authorizes a document view and writes the required audit entry, then returns
// the document so the caller can mint a signed url. read access scopes this to
// owner + staff + admin; every view — including admin — is logged
const getVaultDocumentForView = async (
	payload: Payload,
	user: User,
	documentId: string,
): Promise<Result<{ document: VaultDocument }>> => {
	try {
		const document = await payload.findByID({
			collection: "vault-documents",
			id: documentId,
			depth: 0,
			overrideAccess: false,
			req: { user },
		});

		if (!document) {
			// not found and access-denied are indistinguishable after the fact, and
			// that is deliberate — a 404 never confirms whether a document exists
			return { success: false, error: "Document not found.", code: "not_found" };
		}

		await writeAuditLog({
			action: "document_viewed",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: toId(document.uploadedBy),
			targetLabel: null,
			metadata: {
				documentType: document.documentType,
				profileId: toId(document.profile),
				viewerRole: user.role,
			},
		});

		return { success: true, data: { document } };
	} catch (error) {
		console.error("[services/vault] getVaultDocumentForView failed:", error);
		return { success: false, error: "Could not retrieve the document." };
	}
};

// deletes a document. the caller must be able to read it (owner or staff/admin)
// — that read is the authorization — after which the delete is a trusted write
// against the sealed collection
const deleteVaultDocument = async (
	payload: Payload,
	user: User,
	documentId: string,
): Promise<Result> => {
	try {
		const document = await payload.findByID({
			collection: "vault-documents",
			id: documentId,
			depth: 0,
			overrideAccess: false,
			req: { user },
		});

		if (!document) {
			return { success: false, error: "Document not found.", code: "not_found" };
		}

		// same review lock as upload — the owning profile must not be under
		// review when a document is removed. a trusted read: the caller is already
		// authorized by the document read above, and the verification state is used
		// only for the lock + reverification decision
		const profileId = toId(document.profile);
		let wasVerified = false;
		if (profileId) {
			const profile = await payload.findByID({
				collection: "wajakazi-profiles",
				id: profileId,
				depth: 0,
				overrideAccess: true,
			});
			if (profile?.verificationState === "pending_review") {
				return {
					success: false,
					error: "Documents are locked while your verification is under review.",
					code: "documents_locked",
				};
			}
			wasVerified = profile?.verificationState === "verified";
		}

		await payload.delete({
			collection: "vault-documents",
			id: document.id,
			overrideAccess: true,
		});

		await writeAuditLog({
			action: "document_deleted",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: toId(document.uploadedBy),
			targetLabel: null,
			metadata: {
				documentType: document.documentType,
				profileId: toId(document.profile),
			},
		});

		// a verified worker's documents are the reviewed evidence — removing one
		// sends the profile back for a free re-review
		if (wasVerified && profileId) {
			const reverted = await revertToReview(payload, profileId);
			if (!reverted.success) {
				console.warn("[services/vault] reverification trigger failed:", reverted.error);
			}
		}

		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/vault] deleteVaultDocument failed:", error);
		return { success: false, error: "Could not delete the document." };
	}
};

export { deleteVaultDocument, getVaultDocumentForView, uploadVaultDocument };
