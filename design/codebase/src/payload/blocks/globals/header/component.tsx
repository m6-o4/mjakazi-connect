import type { Header } from "@/payload-types";
import { HeaderClient } from "@/payload/blocks/globals/header/component-client";
import { getCachedGlobal } from "@/payload/utilities/get-globals";

// fetches header data on the server to ensure fast initial page loads and seo
const Header = async () => {
	// retrieves the header global content using a cached helper to minimize database hits
	const headerData: Header = await getCachedGlobal("header", 1)();

	// passes the server-fetched data to the client component for interactive rendering
	return <HeaderClient data={headerData} />;
};

export { Header };
