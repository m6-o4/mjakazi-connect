import { isBrowser } from "@/payload/utilities/is-browser";

// returns the base url for server-side use, taken from environment variables
const getServerSideURL = () => {
	return process.env.NEXT_PUBLIC_SERVER_URL!;
};

// returns the base url for client-side use
// builds it from the browser's window.location when available
// falls back to the server-side url if not in a browser
const getClientSideURL = () => {
	if (isBrowser) {
		const protocol = window.location.protocol;
		const domain = window.location.hostname;
		const port = window.location.port;
		return `${protocol}//${domain}${port ? `:${port}` : ""}`;
	}

	return process.env.NEXT_PUBLIC_SERVER_URL!;
};

export { getServerSideURL, getClientSideURL };
