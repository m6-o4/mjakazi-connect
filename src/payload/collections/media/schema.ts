import { isAdminOrEditor, isPublic } from "@/payload/access/access-control";
import type { CollectionConfig } from "payload";

const Media: CollectionConfig = {
	slug: "media",
	labels: { singular: "Media", plural: "Media" },
	admin: {
		defaultColumns: ["filename", "alt", "caption", "createdAt", "updatedAt"],
		group: "Globals",
		useAsTitle: "filename",
	},
	access: {
		create: isAdminOrEditor,
		delete: isAdminOrEditor,
		read: isPublic,
		update: isAdminOrEditor,
	},
	fields: [
		{ name: "alt", type: "text", label: "Alternative Text", required: true },
		{ name: "caption", type: "text", label: "Caption" },
	],
	upload: {
		adminThumbnail: "thumbnail",
		focalPoint: true,
		imageSizes: [
			{ name: "thumbnail", width: 300, height: 300, position: "centre" },
			{ name: "card", width: 768, height: 1024, position: "centre" },
			{ name: "hero", width: 1920, height: 1080, position: "centre" },
			{ name: "og", width: 1200, height: 630, crop: "center" },
		],
		mimeTypes: ["application/pdf", "image/jpeg", "image/png", "image/webp"],
	},
};

export { Media };
