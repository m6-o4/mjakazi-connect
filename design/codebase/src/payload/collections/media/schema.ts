import { isAuthenticated, isPublic } from "@/payload/access/access-control";
import type { CollectionConfig } from "payload";

// defines the media collection for managing uploads and image processing
const Media: CollectionConfig = {
	slug: "media",
	// restricts modifications to authenticated users while allowing public reading
	access: {
		create: isAuthenticated,
		delete: isAuthenticated,
		read: isPublic,
		update: isAuthenticated,
	},
	// configures the admin interface for file management
	admin: {
		defaultColumns: ["filename", "alt", "createdAt", "updatedAt"],
		group: "Globals",
		useAsTitle: "filename",
	},
	labels: { singular: "Media", plural: "Media" },
	// ensures all assets have descriptive text for accessibility and seo
	fields: [{ name: "alt", type: "text", label: "Alt Text", required: true }],
	// enables file uploads
	upload: {
		adminThumbnail: "filename",
		focalPoint: true,
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

export { Media };
