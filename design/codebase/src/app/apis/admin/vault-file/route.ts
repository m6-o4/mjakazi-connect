import { resolveIdentity } from "@/services/identity.service";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// vault files are stored in a private bucket inaccessible to the browser;
// this route verifies the clerk session then issues a pre-signed url so
// the storage provider serves the file directly — no server-side buffering
export async function GET(req: Request) {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found" }, { status: 404 });
	}

	// vault documents contain sensitive worker identity data;
	// only admin and sa roles should ever view them
	if (identity.role !== "admin" && identity.role !== "sa") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const { searchParams } = new URL(req.url);
	const documentId = searchParams.get("id");

	if (!documentId) {
		return NextResponse.json({ error: "Document ID required" }, { status: 400 });
	}

	const vaultDoc = await payload.findByID({
		collection: "vault",
		id: documentId,
		overrideAccess: true,
	});

	if (!vaultDoc) {
		return NextResponse.json({ error: "Document not found" }, { status: 404 });
	}

	const filename = vaultDoc.filename;

	if (!filename) {
		return NextResponse.json({ error: "Filename not found" }, { status: 404 });
	}

	// dev uses MinIO; production uses Cloudflare R2 — both are S3-compatible
	const isProduction = process.env.NODE_ENV === "production";

	const s3Client = new S3Client({
		region: isProduction ? process.env.CLOUDFLARE_REGION! : process.env.MINIO_REGION!,
		endpoint: isProduction
			? process.env.CLOUDFLARE_ENDPOINT!
			: process.env.MINIO_ENDPOINT!,
		credentials: {
			accessKeyId: isProduction
				? process.env.CLOUDFLARE_ACCESS_KEY_ID!
				: process.env.MINIO_ACCESS_KEY_ID!,
			secretAccessKey: isProduction
				? process.env.CLOUDFLARE_ACCESS_KEY_SECRET!
				: process.env.MINIO_ACCESS_KEY_SECRET!,
		},
		// forcePathStyle is required for MinIO and R2 which don't support virtual-hosted style
		forcePathStyle: true,
	});

	const bucket = isProduction
		? process.env.CLOUDFLARE_BUCKET!
		: process.env.MINIO_BUCKET!;

	try {
		// payload's s3 plugin prefixes the object key with the bucket name
		// when writing — the key must match that structure to resolve correctly
		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: filename,
		});

		// 60 seconds is sufficient for the browser to follow the redirect;
		// keeping it short limits exposure if the url is leaked
		const signedUrl = await getSignedUrl(s3Client, command, {
			expiresIn: 60,
		});

		return NextResponse.redirect(signedUrl);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
