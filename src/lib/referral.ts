// shared bounds and policy defaults for off-platform referrals. imported by the
// payload field, the zod schemas and the settings service, so the admin panel,
// the forms and the service can never disagree about the limits.

// the referral note cap, read by the payload field and the zod schema
const REFERRAL_NOTE_MAX_LENGTH = 1000;

// the fallbacks used when the platform-settings referral policy, or one of its
// fields, is unset. they mirror the schema defaults, so behaviour is identical
// whether or not an admin has ever opened the settings form
const DEFAULT_REFERRAL_POLICY = {
	inviteExpiryDays: 7,
	resendCooldownDays: 7,
	maxOutstandingInvites: 5,
} as const;

export { DEFAULT_REFERRAL_POLICY, REFERRAL_NOTE_MAX_LENGTH };
