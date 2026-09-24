import type { Where } from "payload";
import { z } from "zod";

// a document type is what the document is. a side is which physical face of it
// a file is — one file per side, so a single pdf containing both faces still
// counts as one side
const documentTypeSchema = z.enum(["national_id", "certificate_of_good_conduct"]);
const documentSideSchema = z.enum(["front", "back"]);

type DocumentType = z.infer<typeof documentTypeSchema>;
type DocumentSide = z.infer<typeof documentSideSchema>;

const DOCUMENT_SIDE_OPTIONS: readonly { label: string; value: DocumentSide }[] = [
	{ label: "Front", value: "front" },
	{ label: "Back", value: "back" },
];

const documentSideLabel = (side: DocumentSide): string =>
	DOCUMENT_SIDE_OPTIONS.find((option) => option.value === side)?.label ?? side;

type DocumentSlotRequirement = {
	value: DocumentType;
	label: string;
	description: string;
	slots: readonly { side: DocumentSide; required: boolean }[];
};

// the document types and the sides each one needs. this is the single source of
// truth: the collection's option lists, the upload UI, the staff viewer and the
// pre-submission gate all read it, so none of them can disagree about what a
// complete document set is. adding a side later is a row here, not a new type
const DOCUMENT_SLOTS: readonly DocumentSlotRequirement[] = [
	{
		value: "national_id",
		label: "National ID",
		description: "Shown to our team to confirm your identity.",
		slots: [
			{ side: "front", required: true },
			{ side: "back", required: true },
		],
	},
	{
		value: "certificate_of_good_conduct",
		label: "Certificate of Good Conduct",
		description: "Shown to our team to confirm your clean record.",
		slots: [
			{ side: "front", required: true },
			{ side: "back", required: true },
		],
	},
];

const DOCUMENT_TYPE_OPTIONS = DOCUMENT_SLOTS.map(({ value, label }) => ({
	label,
	value,
}));
const DOCUMENT_SIDE_SELECT_OPTIONS = DOCUMENT_SIDE_OPTIONS.map(({ label, value }) => ({
	label,
	value,
}));

// a record stored before the side field existed has no side. it was a first
// generation upload, so it is treated as the front rather than dropped
const normalizeDocumentSide = (side: string | null | undefined): DocumentSide =>
	side === "back" ? "back" : "front";

// the identity of one slot: what the document is plus which face. one normalized
// string, so the gate, the checklist and the upload ui cannot disagree about
// which slot a record occupies
const documentSlotKey = (documentType: string, side: string | null | undefined): string =>
	`${documentType}:${normalizeDocumentSide(side)}`;

// the query fragment that matches the record occupying a slot, used by the
// replace lookup. derived from the same normalization as the gate so the
// front/back rule has one definition — and a front slot also matches a record
// stored before the side field existed, because that record reads as the front
const documentSlotWhere = (side: DocumentSide): Where =>
	normalizeDocumentSide(side) === "front"
		? { or: [{ side: { equals: "front" } }, { side: { exists: false } }] }
		: { side: { equals: side } };

// whether a (documentType, side) pair is a slot this system recognises. the two
// enums are flat, so without this check the write path would accept a pair that
// no ui enumerates and the gate ignores — a back side on a document that
// declares only a front, say
const isDocumentSlot = (documentType: string, side: string): boolean =>
	DOCUMENT_SLOTS.some(
		(document) =>
			document.value === documentType &&
			document.slots.some((slot) => slot.side === side),
	);

// the label the worker and staff see for a single slot. a multi-sided document
// names the side; a single-sided one does not, because "front" is meaningless
// when there is only one face
const documentSlotLabel = (documentType: DocumentType, side: DocumentSide): string => {
	const document = DOCUMENT_SLOTS.find((entry) => entry.value === documentType);
	if (!document) return side;
	return document.slots.length > 1
		? `${document.label} — ${documentSideLabel(side)}`
		: document.label;
};

type RequiredDocumentSlot = {
	documentType: DocumentType;
	side: DocumentSide;
	label: string;
};

const REQUIRED_DOCUMENT_SLOTS: readonly RequiredDocumentSlot[] = DOCUMENT_SLOTS.flatMap(
	(document) =>
		document.slots
			.filter((slot) => slot.required)
			.map((slot) => ({
				documentType: document.value,
				side: slot.side,
				label: documentSlotLabel(document.value, slot.side),
			})),
);

// the pre-submission rule: every required slot is populated. takes only the
// document's type and side — never the bytes
const getMissingDocumentSlots = (
	documents: readonly { documentType: string; side?: string | null }[],
): readonly RequiredDocumentSlot[] => {
	const present = new Set(
		documents.map((doc) => documentSlotKey(doc.documentType, doc.side)),
	);
	return REQUIRED_DOCUMENT_SLOTS.filter(
		(slot) => !present.has(documentSlotKey(slot.documentType, slot.side)),
	);
};

const isDocumentSetComplete = (
	documents: readonly { documentType: string; side?: string | null }[],
): boolean => getMissingDocumentSlots(documents).length === 0;

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

export {
	DOCUMENT_SIDE_SELECT_OPTIONS,
	DOCUMENT_SLOTS,
	DOCUMENT_TYPE_OPTIONS,
	documentSideLabel,
	documentSideSchema,
	documentSlotKey,
	documentSlotLabel,
	documentSlotWhere,
	documentTypeSchema,
	getMissingDocumentSlots,
	isDocumentSetComplete,
	isDocumentSlot,
	normalizeDocumentSide,
	REQUIRED_DOCUMENT_SLOTS,
	VAULT_MAX_BYTES,
	VAULT_MIME_TYPES,
};
export type { RequiredDocumentSlot };
