import { writeAuditLog } from "@/lib/audit";
import { generateUniqueFilename } from "@/lib/generate-unique-filename";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// whitelist of allowed document types
const VALID_DOCUMENT_TYPES = [
	"national_id",
	"good_conduct",
	"qualification",
	"other",
] as const;

type DocumentType = (typeof VALID_DOCUMENT_TYPES)[number];

const isValidDocumentType = (value: string): value is DocumentType => {
	return VALID_DOCUMENT_TYPES.includes(value as DocumentType);
};

// infer mime type from file metadata or extension
const resolveMimeType = (file: File): string => {
	if (file.type) return file.type;

	const ext = file.name.split(".").pop()?.toLowerCase();
	const mimeMap: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		svg: "image/svg+xml",
		webp: "image/webp",
		pdf: "application/pdf",
	};

	return mimeMap[ext ?? ""] ?? "application/octet-stream";
};

// handle document upload, including replacing existing versions
const POST = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// ensure caller is an authorized mjakazi
	if (!identity) {
		return NextResponse.json({ error: "Identity not found" }, { status: 404 });
	}

	if (identity.role !== "mjakazi") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	if (!identity.wajakaziProfileId) {
		return NextResponse.json({ error: "Profile not found" }, { status: 404 });
	}

	const formData = await req.formData();
	const file = formData.get("file") as File;
	const documentType = formData.get("documentType") as string;
	const existingDocumentId = formData.get("existingDocumentId") as string | null;

	if (!file) {
		return NextResponse.json({ error: "File missing" }, { status: 400 });
	}

	if (!documentType || !isValidDocumentType(documentType)) {
		return NextResponse.json(
			{ error: "Invalid or missing documentType" },
			{ status: 400 },
		);
	}

	// fetch profile to check current state and logging
	const profile = await payload.findByID({
		collection: "wajakaziprofiles",
		id: identity.wajakaziProfileId,
		overrideAccess: true,
	});

	if (existingDocumentId) {
		try {
			// remove previous version if replacing
			await payload.delete({
				collection: "vault",
				id: existingDocumentId,
				overrideAccess: true,
			});
		} catch {
			console.warn("Failed to delete existing vault document:", existingDocumentId);
		}

		// downgrade verified status if replacing a document, requiring new payment/review
		if (profile?.verificationStatus === "verified") {
			await payload.update({
				collection: "wajakaziprofiles",
				id: identity.wajakaziProfileId,
				data: { verificationStatus: "pending_payment" },
				overrideAccess: true,
			});

			const accountQuery = await payload.find({
				collection: "accounts",
				where: { clerkId: { equals: userId } },
				overrideAccess: true,
				limit: 1,
			});

			const account = accountQuery.docs[0] ?? null;
			const actorLabel = account
				? [account.firstName, account.lastName].filter(Boolean).join(" ").trim() ||
					account.email
				: userId;

			await writeAuditLog({
				action: "verification_submitted",
				actorId: identity.accountId,
				actorLabel,
				targetId: identity.accountId,
				targetLabel: actorLabel,
				metadata: {
					profileId: identity.wajakaziProfileId,
					fromStatus: "verified",
					toStatus: "pending_payment",
					trigger: "document_replaced",
					documentType,
				},
				source: "user",
			});
		}
	} else {
		// prevent multiple uploads of the same type
		const existingDoc = await payload.find({
			collection: "vault",
			where: {
				and: [
					{ profile: { equals: identity.wajakaziProfileId } },
					{ documentType: { equals: documentType } },
				],
			},
			overrideAccess: true,
			limit: 1,
		});

		if (existingDoc.totalDocs >= 1) {
			return NextResponse.json(
				{ error: "A document of this type has already been uploaded." },
				{ status: 400 },
			);
		}
	}

	const mimeType = resolveMimeType(file);
	const fileBuffer = await file.arrayBuffer();
	const uniqueFilename = generateUniqueFilename(file.name);

	try {
		// store document and associate with profile
		const vaultDocument = await payload.create({
			collection: "vault",
			draft: false,
			overrideAccess: true,
			data: {
				profile: identity.wajakaziProfileId,
				uploadedBy: identity.accountId,
				documentType,
			},
			file: {
				data: Buffer.from(fileBuffer),
				mimetype: mimeType,
				name: uniqueFilename,
				size: file.size,
			},
		});

		return NextResponse.json({
			success: true,
			documentId: vaultDocument.id,
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
};

export { POST };
