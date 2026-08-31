import type { CollectionConfig } from "payload";

import { DOCUMENT_TYPE_OPTIONS, VAULT_MIME_TYPES } from "@/lib/vault";
import { isAdminOrOwner, isRestricted } from "@/payload/access/access-control";

// the private store for a mjakazi's two identity documents. the collection is
// sealed — create/update/delete are refused at payload's own surface and happen
// only through the vault service, which authorizes and audits each action. read
// is owner + staff + admin, scoped by uploader, so a mjakazi can never resolve
// another worker's documents.
//
// the binary lives in s3 with a private acl and signedDownloads enabled (see
// plugins/schema.ts), so there is no public object path. the only route to the
// bytes is the authenticated, audited handler in app/(payload)/api/actions/vault
const VaultDocuments: CollectionConfig = {
	slug: "vault-documents",
	labels: { singular: "Vault Document", plural: "Vault Documents" },
	admin: {
		defaultColumns: ["documentType", "profile", "uploadedBy", "updatedAt"],
		group: "SaaS",
		useAsTitle: "documentType",
	},
	access: {
		create: isRestricted,
		read: isAdminOrOwner("uploadedBy"),
		update: isRestricted,
		delete: isRestricted,
	},
	fields: [
		{
			name: "profile",
			type: "relationship",
			relationTo: "wajakazi-profiles",
			label: "Mjakazi Profile",
			required: true,
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "uploadedBy",
			type: "relationship",
			relationTo: "users",
			label: "Uploaded By",
			required: true,
			index: true,
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "documentType",
			type: "select",
			label: "Document Type",
			required: true,
			options: DOCUMENT_TYPE_OPTIONS.map((option) => ({
				label: option.label,
				value: option.value,
			})),
		},
	],
	upload: {
		mimeTypes: [...VAULT_MIME_TYPES],
	},
	timestamps: true,
};

export { VaultDocuments };
