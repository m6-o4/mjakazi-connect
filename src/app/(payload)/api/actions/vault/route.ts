import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import { documentTypeSchema, VAULT_MAX_BYTES, VAULT_MIME_TYPES } from "@/lib/vault";
import config from "@/payload-config";
import { uploadVaultDocument } from "@/services/vault.service";

// some clients omit the mime type on the File object; infer it from the
// extension so payload always receives a valid value
const resolveMimeType = (file: File): string => {
	if (file.type) return file.type;

	const extension = file.name.split(".").pop()?.toLowerCase();
	const mimeByExtension: Record<string, string> = {
		pdf: "application/pdf",
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		webp: "image/webp",
	};

	return mimeByExtension[extension ?? ""] ?? "application/octet-stream";
};

// vault document upload. a route handler rather than a server action because
// documents can reach 5MB, past the 1MB body cap server actions enforce
const POST = async (req: NextRequest) => {
	try {
		const payload = await getPayload({ config });
		const { user } = await payload.auth({ headers: req.headers });

		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}
		if (user.role !== "mjakazi") {
			return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
		}

		const formData = await req.formData();
		const file = formData.get("file");
		const documentTypeRaw = formData.get("documentType");

		if (!(file instanceof File)) {
			return NextResponse.json(
				{ success: false, error: "Document is required." },
				{ status: 400 },
			);
		}

		const parsedType = documentTypeSchema.safeParse(documentTypeRaw);
		if (!parsedType.success) {
			return NextResponse.json(
				{ success: false, error: "Invalid document type." },
				{ status: 400 },
			);
		}

		if (file.size > VAULT_MAX_BYTES) {
			return NextResponse.json(
				{ success: false, error: "Document must be under 5MB." },
				{ status: 400 },
			);
		}

		const mimetype = resolveMimeType(file);
		if (!VAULT_MIME_TYPES.includes(mimetype)) {
			return NextResponse.json(
				{ success: false, error: "Unsupported file type." },
				{ status: 400 },
			);
		}

		const buffer = Buffer.from(await file.arrayBuffer());
		const name = `${Date.now()}-${file.name}`;

		const result = await uploadVaultDocument(payload, user, {
			documentType: parsedType.data,
			file: { data: buffer, mimetype, name, size: file.size },
		});

		if (!result.success) {
			return NextResponse.json({ success: false, error: result.error }, { status: 400 });
		}

		// deliberately omit url — the object path is private and documents are
		// only ever reached through the audited /api/actions/vault/{id} route
		return NextResponse.json({
			success: true,
			replaced: result.data.replaced,
			document: {
				id: result.data.document.id,
				documentType: result.data.document.documentType,
				filename: result.data.document.filename ?? null,
			},
		});
	} catch (error) {
		console.error("[api/actions/vault]", error);
		return NextResponse.json(
			{ success: false, error: "Could not upload the document." },
			{ status: 500 },
		);
	}
};

export { POST };
