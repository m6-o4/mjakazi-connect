import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

const PATCH = async (req: Request) => {
	const { userId } = await auth();

	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	if (!identity) {
		return NextResponse.json({ error: "Identity not found." }, { status: 404 });
	}

	if (identity.role !== "mwajiri") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	if (!identity.waajiriProfileId) {
		return NextResponse.json({ error: "Profile not found." }, { status: 404 });
	}

	const body = await req.json();
	const { displayName } = body;

	if (!displayName) {
		return NextResponse.json({ error: "Display name is required." }, { status: 400 });
	}

	try {
		await payload.update({
			collection: "waajiriprofiles",
			id: identity.waajiriProfileId,
			overrideAccess: true,
			data: {
				displayName: displayName.trim(),
			},
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		return NextResponse.json({ error: error.message }, { status: 400 });
	}
};

export { PATCH };
