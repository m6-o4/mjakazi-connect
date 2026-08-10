import type { Footer } from "@/payload-types";
import { FooterClient } from "@/payload/blocks/globals/footer/component-client";
import { getCachedGlobal } from "@/payload/utilities/get-globals";

// fetches footer data on the server to ensure fast initial page loads and seo
const Footer = async () => {
	// retrieves the footer global content using a cached helper to minimize database hits
	const footerData: Footer = await getCachedGlobal("footer", 1)();

	// passes the server-fetched data to the client component for interactive rendering
	return <FooterClient data={footerData} />;
};

export { Footer };
