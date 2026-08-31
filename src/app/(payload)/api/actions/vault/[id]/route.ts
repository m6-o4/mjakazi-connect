import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import { createSignedDownloadUrl } from "@/lib/s3";
import config from "@/payload-config";
import { deleteVaultDocument, getVaultDocumentForView } from "@/services/vault.service";

// serves (by redirect to a short-lived signed url) a vault document only to its
// owner, staff or admin, and writes a document_viewed audit entry on every
// retrieval — no exceptions
const GET = async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
	try {
		const { id } = await params;

		const payload = await getPayload({ config });
		const { user } = await payload.auth({ headers: req.headers });

		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const result = await getVaultDocumentForView(payload, user, id);
		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: result.code === "not_found" ? 404 : 400 },
			);
		}

		const filename = result.data.document.filename;
		if (!filename) {
			return NextResponse.json(
				{ success: false, error: "Document file not found." },
				{ status: 404 },
			);
		}

		const signedUrl = await createSignedDownloadUrl(filename);
		return NextResponse.redirect(signedUrl);
	} catch (error) {
		console.error("[api/actions/vault/[id]]", error);
		return NextResponse.json(
			{ success: false, error: "Could not retrieve the document." },
			{ status: 500 },
		);
	}
};

// removes a document. authorized the same way as a view — owner, staff or admin
const DELETE = async (
	req: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) => {
	try {
		const { id } = await params;

		const payload = await getPayload({ config });
		const { user } = await payload.auth({ headers: req.headers });

		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		const result = await deleteVaultDocument(payload, user, id);
		if (!result.success) {
			return NextResponse.json(
				{ success: false, error: result.error },
				{ status: result.code === "not_found" ? 404 : 400 },
			);
		}

		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("[api/actions/vault/[id]]", error);
		return NextResponse.json(
			{ success: false, error: "Could not delete the document." },
			{ status: 500 },
		);
	}
};

export { DELETE, GET };
