import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// read once at module scope so the client is shared rather than rebuilt per
// request. these are the same S3_* variables the storage plugin uses — MinIO in
// dev, Cloudflare R2 in production, differing only by endpoint/region/credentials
const bucket = process.env.S3_BUCKET!;
const accessKeyId = process.env.S3_ACCESS_KEY_ID!;
const accessKeySecret = process.env.S3_ACCESS_KEY_SECRET!;
const region = process.env.S3_REGION!;
const endpoint = process.env.S3_ENDPOINT!;

const s3Client = new S3Client({
	credentials: { accessKeyId, secretAccessKey: accessKeySecret },
	region,
	endpoint,
	forcePathStyle: true, // required for minio and r2
});

// mints a short-lived signed url for a private vault object. 60s is enough for
// the browser to follow the redirect without leaving a reusable link around
const createSignedDownloadUrl = async (filename: string): Promise<string> => {
	const command = new GetObjectCommand({ Bucket: bucket, Key: filename });
	return getSignedUrl(s3Client, command, { expiresIn: 60 });
};

export { createSignedDownloadUrl };
