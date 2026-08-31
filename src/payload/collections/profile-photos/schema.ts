import type { CollectionConfig } from "payload";

import {
	isAdminOrOwner,
	isMjakazi,
	isPublic,
} from "@/payload/access/access-control";

// user-uploaded profile photos. deliberately separate from `media` (the public
// marketing library): `media` is staff-authored and CDN-public, whereas a photo
// here is tied to a mjakazi and managed by its owner. the binary itself is
// public so the directory can render it, but the owning profile only ever
// surfaces the photo when it is verified and available — see
// isDirectoryVisibleOrOwner
const ProfilePhotos: CollectionConfig = {
	slug: "profile-photos",
	labels: { singular: "Profile Photo", plural: "Profile Photos" },
	admin: {
		defaultColumns: ["user", "filename", "createdAt"],
		group: "SaaS",
		useAsTitle: "filename",
	},
	access: {
		create: isMjakazi,
		read: isPublic,
		update: isAdminOrOwner("user"),
		delete: isAdminOrOwner("user"),
	},
	fields: [
		{
			name: "user",
			type: "relationship",
			relationTo: "users",
			label: "Owner",
			required: true,
			// the photo is 1:1 with its owner — never re-pointed after creation
			access: { update: () => false },
			admin: { readOnly: true, position: "sidebar" },
		},
		{
			name: "alt",
			type: "text",
			label: "Alternative Text",
		},
	],
	upload: {
		adminThumbnail: "thumbnail",
		imageSizes: [
			{ name: "thumbnail", width: 300, height: 300, position: "centre" },
			{ name: "card", width: 768, height: 1024, position: "centre" },
		],
		mimeTypes: ["image/jpeg", "image/png", "image/webp"],
	},
	timestamps: true,
};

export { ProfilePhotos };
