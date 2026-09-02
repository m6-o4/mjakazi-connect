import { NextRequest, NextResponse } from "next/server";
import { getPayload } from "payload";

import config from "@/payload-config";
import { uploadProfilePhoto } from "@/services/profile.service";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

// some clients omit the mime type on the File object; infer it from the
// extension so payload always receives a valid value
const resolveMimeType = (file: File): string => {
	if (file.type) return file.type;

	const extension = file.name.split(".").pop()?.toLowerCase();
	const mimeByExtension: Record<string, string> = {
		jpg: "image/jpeg",
		jpeg: "image/jpeg",
		png: "image/png",
		webp: "image/webp",
	};

	return mimeByExtension[extension ?? ""] ?? "image/jpeg";
};

// profile photo upload. a route handler rather than a server action because
// server actions cap the request body at 1MB and a photo can be up to 5MB
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

		if (!(file instanceof File)) {
			return NextResponse.json(
				{ success: false, error: "Photo is required." },
				{ status: 400 },
			);
		}

		if (file.size > MAX_PHOTO_BYTES) {
			return NextResponse.json(
				{ success: false, error: "Photo must be under 5MB." },
				{ status: 400 },
			);
		}

		const mimetype = resolveMimeType(file);
		const buffer = Buffer.from(await file.arrayBuffer());
		const name = `${Date.now()}-${file.name}`;

		const result = await uploadProfilePhoto(payload, user, {
			data: buffer,
			mimetype,
			name,
			size: file.size,
		});

		if (!result.success) {
			return NextResponse.json({ success: false, error: result.error }, { status: 400 });
		}

		return NextResponse.json({
			success: true,
			photo: { id: result.data.photo.id, url: result.data.photo.url ?? null },
			profileComplete: result.data.profileComplete,
		});
	} catch (error) {
		console.error("[api/actions/profile/photo]", error);
		return NextResponse.json(
			{ success: false, error: "Could not upload the photo." },
			{ status: 500 },
		);
	}
};

export { POST };
