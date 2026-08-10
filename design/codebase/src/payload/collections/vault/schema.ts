import { isAdminOrVaultOwner, isRestricted } from "@/payload/access/access-control";
import type { CollectionConfig } from "payload";

// secure document storage for wajakazi verification files
const Vault: CollectionConfig = {
	slug: "vault",
	access: {
		// documents are managed through system hooks or server-side logic
		create: isRestricted,
		update: isRestricted,
		delete: isRestricted,
		// allows admins and the document owner to view the files
		read: isAdminOrVaultOwner,
	},
	admin: {
		defaultColumns: ["filename", "createdAt", "updatedAt"],
		group: "SaaS",
		useAsTitle: "filename",
	},
	labels: { singular: "Vault Document", plural: "Vault Documents" },
	fields: [
		{
			// links the document to the specific worker profile it verifies
			name: "profile",
			type: "relationship",
			label: "Mjakazi Profile",
			relationTo: "wajakaziprofiles",
			required: true,
			index: true,
		},
		{
			// tracks the individual account that performed the upload
			name: "uploadedBy",
			type: "relationship",
			label: "Uploaded By",
			relationTo: "accounts",
			required: true,
		},
		{
			// categorizes the document to streamline the administrative review process
			name: "documentType",
			type: "select",
			label: "Document Type",
			required: true,
			options: [
				{ label: "National ID", value: "national_id" },
				{ label: "Certificate of Good Conduct", value: "good_conduct" },
				{ label: "Qualification Certificate", value: "qualification" },
				{ label: "Other", value: "other" },
			],
		},
	],
	// restricts file types to images and pdfs to ensure document compatibility
	upload: {
		mimeTypes: [
			"application/pdf",
			"image/jpeg",
			"image/jpg",
			"image/png",
			"image/svg+xml",
			"image/webp",
		],
	},
};

export { Vault };
