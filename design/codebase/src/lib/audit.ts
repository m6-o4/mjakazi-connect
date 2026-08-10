import config from "@payload-config";
import { getPayload } from "payload";

type AuditAction =
	| "account_created"
	| "account_updated"
	| "account_deleted"
	| "verification_submitted"
	| "verification_approved"
	| "verification_rejected"
	| "payment_initiated"
	| "payment_confirmed"
	| "payment_failed"
	| "payment_expired"
	| "eoi_sent";

type AuditSource = "user" | "system";

interface WriteAuditLogParams {
	action: AuditAction;
	// account id of the person who performed the action
	actorId?: string | null;
	// human-readable label for the actor — name + role, captured at write time
	actorLabel?: string | null;
	// account id of the account the action was performed on
	targetId?: string | null;
	// human-readable label for the target, captured at write time
	targetLabel?: string | null;
	// event-specific context such as rejection reasons or payment amounts
	metadata?: Record<string, unknown> | null;
	source?: AuditSource;
}

// writes a single audit log entry using overrideAccess so the locked-down
// collection can still be written to from server-side code.
// intentionally never throws — a failed audit write is surfaced in server logs
// but must not interrupt the primary operation that triggered it.
const writeAuditLog = async ({
	action,
	actorId = null,
	actorLabel = null,
	targetId = null,
	targetLabel = null,
	metadata = null,
	source = "user",
}: WriteAuditLogParams): Promise<void> => {
	try {
		const payload = await getPayload({ config });

		await payload.create({
			collection: "audit-logs",
			data: {
				action,
				actor: actorId ?? undefined,
				// fall back to "System" when no actor is provided so the log
				// entry is still meaningful for automated background events
				actorLabel: actorLabel ?? "System",
				target: targetId ?? undefined,
				targetLabel: targetLabel ?? undefined,
				metadata: metadata ?? undefined,
				source,
			},
			overrideAccess: true,
		});
	} catch (error) {
		// audit failures are non-fatal — the platform continues operating
		// but the gap is surfaced in server logs for investigation
		console.error("[AuditLog] Failed to write audit entry:", {
			action,
			actorId,
			targetId,
			error,
		});
	}
};

export { writeAuditLog };
export type { AuditAction, WriteAuditLogParams };
