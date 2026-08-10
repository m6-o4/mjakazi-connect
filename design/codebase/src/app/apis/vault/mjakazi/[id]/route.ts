import { resolveIdentity } from "@/services/identity.service";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// generates a short-lived presigned URL for a vault document owned by the requesting mjakazi,
// then redirects the client directly to the object in S3-compatible storage
export async function GET(
	_req: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	// require an authenticated Clerk session before anything else
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
	}

	const { id } = await params;
	const payload = await getPayload({ config });

	// resolve the platform identity tied to this Clerk user
	const identity = await resolveIdentity(payload, userId);

	// only mjakazi-role users may access vault documents through this endpoint
	if (!identity || identity.role !== "mjakazi") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	// bypass collection-level access rules so the lookup always succeeds regardless
	// of how payload access control is configured — authz is enforced manually below
	const vaultDoc = await payload.findByID({
		collection: "vault",
		id,
		overrideAccess: true,
	});

	if (!vaultDoc) {
		return NextResponse.json({ error: "Document not found" }, { status: 404 });
	}

	// normalise the profile reference regardless of whether payload populated it or left it as an id string
	const profileId =
		typeof vaultDoc.profile === "string" ? vaultDoc.profile : vaultDoc.profile?.id;

	// ensure the vault record belongs to this mjakazi — prevents horizontal privilege escalation
	// where one authenticated mjakazi could request another user's document by guessing an id
	if (profileId !== identity.wajakaziProfileId) {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const filename = vaultDoc.filename;

	if (!filename) {
		return NextResponse.json({ error: "Filename not found" }, { status: 404 });
	}

	// switch storage backends based on environment: Cloudflare R2 in production, MinIO locally
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
		// path-style addressing is required for MinIO and Cloudflare R2 compatibility
		forcePathStyle: true,
	});

	const bucket = isProduction
		? process.env.CLOUDFLARE_BUCKET!
		: process.env.MINIO_BUCKET!;

	try {
		const command = new GetObjectCommand({ Bucket: bucket, Key: filename });

		// URL expires in 60 seconds — enough for the browser to initiate the download
		// without leaving a reusable link exposed for long
		const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 60 });

		// redirect the client so the file download comes directly from storage,
		// avoiding proxying the binary through the Next.js server
		return NextResponse.redirect(signedUrl);
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 500 });
	}
}
