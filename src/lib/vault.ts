import { z } from "zod";

// the two identity documents a mjakazi uploads for verification. single source
// of truth for the collection options, the upload UI and the Phase 3 submit gate
const DOCUMENT_TYPE_OPTIONS = [
	{ label: "National ID", value: "national_id" },
	{ label: "Certificate of Good Conduct", value: "certificate_of_good_conduct" },
] as const;

type DocumentType = (typeof DOCUMENT_TYPE_OPTIONS)[number]["value"];

// documents are small (a photographed id or a single-page pdf) but must never
// let an oversized file into the vault — same ceiling as the profile photo
const VAULT_MAX_BYTES = 5 * 1024 * 1024;

// mirrors the collection upload.mimeTypes. kept here so the upload route can
// reject a bad type before payload ever sees the bytes
const VAULT_MIME_TYPES: readonly string[] = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
];

// validates the documentType claim that arrives from the client. a client can
// send any string, so this is the control
const documentTypeSchema = z.enum(["national_id", "certificate_of_good_conduct"]);

export { DOCUMENT_TYPE_OPTIONS, VAULT_MAX_BYTES, VAULT_MIME_TYPES, documentTypeSchema };
export type { DocumentType };
