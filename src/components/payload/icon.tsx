import { Media } from "@/payload-types";
import config from "@/payload-config";
import Image from "next/image";
import { getPayload } from "payload";

const Icon = async () => {
	const payload = await getPayload({ config: config });
	const branding = await payload.findGlobal({ slug: "branding" });

	const icon = branding.organizationIcon as Media;

	if (!icon?.url) return null;

	return (
		<>
			<Image src={icon.url} alt={icon.alt || "icon"} width={32} height={32} priority />
		</>
	);
};

export { Icon };
