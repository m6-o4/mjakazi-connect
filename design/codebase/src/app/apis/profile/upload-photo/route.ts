import { generateUniqueFilename } from "@/lib/generate-unique-filename";
import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

// some browsers and http clients omit the mime type on the File object;
// inferring from the extension ensures payload always receives a valid value
const resolveMimeType = (file: File): string => {
	if (file.type) return file.type;
	const ext = file.name.split(".").pop()?.toLowerCase();
	const mimeMap: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		svg: "image/svg+xml",
		webp: "image/webp",
	};
	// default to jpeg — the most common photo format — when the extension is unrecognised
	return mimeMap[ext ?? ""] ?? "image/jpeg";
};

const POST = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found" }, { status: 404 });
	}

	// only mjakazi workers have a profile photo — employers use a different flow
	if (identity.role !== "mjakazi") {
		return NextResponse.json({ error: "Forbidden" }, { status: 403 });
	}

	const formData = await req.formData();
	const file = formData.get("file") as File;

	// optional: client passes the current photo id so we can replace it cleanly
	const existingPhotoId = formData.get("existingPhotoId") as string | null;

	if (!file) {
		return NextResponse.json({ error: "File missing" }, { status: 400 });
	}

	// re-enforce the size limit server-side; client-side validation is bypassable
	if (file.size > 5 * 1024 * 1024) {
		return NextResponse.json({ error: "Photo must be under 5MB." }, { status: 400 });
	}

	const mimeType = resolveMimeType(file);
	const fileBuffer = await file.arrayBuffer();
	const uniqueFilename = generateUniqueFilename(file.name);

	try {
		if (existingPhotoId) {
			try {
				// payload.delete on an upload collection removes the db record
				// and the s3 object together, keeping storage in sync
				await payload.delete({
					collection: "media",
					id: existingPhotoId,
					overrideAccess: true,
				});
			} catch {
				// a failed deletion must not block the new upload;
				// orphaned s3 objects can be reconciled via a cleanup job
				console.warn("Failed to delete previous photo:", existingPhotoId);
			}
		}

		const mediaDoc = await payload.create({
			collection: "media",
			overrideAccess: true,
			data: { alt: "Profile photo" },
			file: {
				data: Buffer.from(fileBuffer),
				mimetype: mimeType,
				name: uniqueFilename,
				size: file.size,
			},
		});

		// return the new media id so the client can link it to the worker's profile
		return NextResponse.json({
			success: true,
			photoId: mediaDoc.id,
			url: mediaDoc.url,
		});
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
};

export { POST };
