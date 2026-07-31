// augments payload's request context so hooks can typecheck against the flag
declare module "payload" {
	export interface RequestContext {
		fromClerkWebhook?: boolean;
	}
}

// shared marker for writes originating from the clerk webhook. the sync hooks
// added in task 3 read this to tell an inbound clerk change from an admin edit,
// which is what stops payload and clerk from writing to each other in a loop
const clerkWebhookContext = { fromClerkWebhook: true } as const;

export { clerkWebhookContext };
