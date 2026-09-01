import { PostHog } from "posthog-node";

const projectToken = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

// created lazily on first use so importing this module never throws when the
// env is unset — capture is a silent no-op in that case
let client: PostHog | null = null;

const getClient = (): PostHog | null => {
	if (client) return client;
	if (!projectToken || !host) return null;
	client = new PostHog(projectToken, {
		host,
		// flush immediately rather than batching so an event is not lost when
		// the process ends between requests
		flushAt: 1,
		flushInterval: 0,
	});
	return client;
};

type PostHogProperties = Record<string, string | number | boolean | null>;

// fire-and-forget server-side capture. never throws, never blocks the caller,
// and carries no personally identifying data — callers pass only the distinct
// id and non-identifying properties
const captureServerEvent = ({
	distinctId,
	event,
	properties,
}: {
	distinctId: string;
	event: string;
	properties?: PostHogProperties;
}): void => {
	try {
		const activeClient = getClient();
		if (!activeClient) return;
		activeClient.capture({ distinctId, event, properties: properties ?? {} });
	} catch (error) {
		console.error(`[lib/posthog-server] failed to capture ${event}:`, error);
	}
};

export { captureServerEvent };
