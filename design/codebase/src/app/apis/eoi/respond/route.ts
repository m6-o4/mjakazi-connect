import { resolveIdentity } from "@/services/identity.service";
import { auth } from "@clerk/nextjs/server";
import config from "@payload-config";
import { NextResponse } from "next/server";
import { getPayload } from "payload";

const VALID_STATUSES = ["interested", "not_interested"] as const;

const PATCH = async (req: Request) => {
	const { userId } = await auth();

	// authenticate request
	if (!userId) {
		return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
	}

	const payload = await getPayload({ config });
	const identity = await resolveIdentity(payload, userId);

	// authorize worker role
	if (!identity || identity.role !== "mjakazi") {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	const { eoiId, status } = await req.json();

	// validate request payload
	if (!eoiId || !VALID_STATUSES.includes(status)) {
		return NextResponse.json({ error: "Invalid request." }, { status: 400 });
	}

	// confirm the eoi belongs to this mjakazi before allowing update
	let eoi: any = null;

	try {
		eoi = await payload.findByID({
			collection: "expressions-of-interest",
			id: eoiId,
			overrideAccess: true,
		});
	} catch {
		return NextResponse.json({ error: "EOI not found." }, { status: 404 });
	}

	const wajakaziProfileId =
		typeof eoi.wajakaziProfile === "string"
			? eoi.wajakaziProfile
			: (eoi.wajakaziProfile as any)?.id;

	// verify eoi ownership
	if (wajakaziProfileId !== identity.wajakaziProfileId) {
		return NextResponse.json({ error: "Forbidden." }, { status: 403 });
	}

	// persist response status
	await payload.update({
		collection: "expressions-of-interest",
		id: eoiId,
		overrideAccess: true,
		data: { status },
	});

	return NextResponse.json({ success: true });
};

export { PATCH };
