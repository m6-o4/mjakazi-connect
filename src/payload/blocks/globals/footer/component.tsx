import type { Footer } from "@/payload-types";
import { FooterClient } from "@/payload/blocks/globals/footer/component-client";
import { getCachedGlobal } from "@/payload/utilities/get-globals";

// fetches footer data on the server to ensure fast initial page loads and seo
const Footer = async () => {
	const footerData: Footer = await getCachedGlobal("footer", 1)();

	return <FooterClient data={footerData} />;
};

export { Footer };
