import { headers as nextHeaders } from "next/headers";
import { getPayload } from "payload";
import config from "@/payload-config";

// resolves the payload user by running the configured auth strategies against
// the incoming request. use this rather than clerk's auth() whenever roles or
// payload document ids are needed, since clerk only knows about clerkId
const getCurrentUser = async () => {
	const payload = await getPayload({ config });
	const headers = await nextHeaders();
	const { user } = await payload.auth({ headers });

	return user;
};

export { getCurrentUser };
