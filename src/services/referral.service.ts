import { createHash, randomBytes } from "crypto";
import { ValidationError, type Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import { sendReferralInviteEmail, sendReferralPublishedEmail } from "@/lib/email";
import { loadProfileDisplay, toId, userLabel } from "@/lib/payload-helpers";
import { JOB_OPTIONS, type JobValue } from "@/lib/profile-constants";
import { REFERRAL_NOTE_MAX_LENGTH } from "@/lib/referral";
import { loadUserEmail } from "@/lib/user-email";
import type { Referral, User } from "@/payload-types";
import { getOwnProfile } from "@/services/profile.service";
import { getReferralPolicy } from "@/services/settings.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type ReferralState = NonNullable<Referral["state"]>;

// what the mjakazi supplies when inviting a former employer. the referrer
// confirms or corrects it on the public page
type InviteInput = {
	referrerName: string;
	referrerEmail: string;
	role: JobValue;
	startDate: string;
	endDate: string;
};

type SubmitInput = {
	token: string;
	referrerName: string;
	role: JobValue;
	startDate: string;
	endDate: string;
	note: string;
};

type MjakaziReferralItem = {
	id: string;
	referrerName: string;
	referrerEmail: string;
	role: string;
	startDate: string | null;
	endDate: string | null;
	note: string | null;
	state: ReferralState;
	invitedAt: string | null;
	submittedAt: string | null;
	publishedAt: string | null;
	inviteExpiresAt: string | null;
	rejectionReason: string | null;
};

type PendingReferralItem = {
	id: string;
	referrerName: string;
	referrerEmail: string;
	mjakaziDisplayName: string | null;
	role: string;
	startDate: string | null;
	endDate: string | null;
	note: string | null;
	submittedAt: string | null;
};

// what the public referrer page renders for a valid, unexpired invite
type ReferralInviteView = {
	referrerName: string;
	mjakaziName: string;
	role: string;
	startDate: string | null;
	endDate: string | null;
};

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

const INVITE_TOKEN_BYTES = 32;
const DAY_MS = 24 * 60 * 60 * 1000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// the invite link is absolute and lives in an email, so it needs the public
// origin. read once at module scope, per the env rule
const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL?.replace(/\/+$/, "") ?? "";

// the raw token is never stored — only its hash — so a database read cannot be
// turned into a usable invite
const createInviteToken = (): string => randomBytes(INVITE_TOKEN_BYTES).toString("hex");
const hashToken = (token: string): string =>
	createHash("sha256").update(token).digest("hex");

// the employer is keyed by a hash of their email so the unique active key never
// carries a raw address into an index or a log
const hashEmail = (email: string): string =>
	createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

const activeKeyFor = (mjakaziId: string, email: string): string =>
	`${mjakaziId}:${hashEmail(email)}`;

// a terminal state frees the pair key so the employer can be invited again once
// the cooldown has passed
const freedKeyFor = (mjakaziId: string, state: string, id: string): string =>
	`${mjakaziId}:${state}:${id}`;

const inviteUrlFor = (token: string): string => `${SERVER_URL}/reference/${token}`;

// a stored date crosses from the server to a client component, so it is
// normalised to a YYYY-MM-DD string here. a date input needs that form, and a
// raw Date must never be serialised across the boundary — mirrors the profile
// page's toDateInputValue
const toDateOnly = (value: string | Date | null | undefined): string | null =>
	value ? new Date(value).toISOString().slice(0, 10) : null;

const isBackOffice = (user: User): boolean =>
	user.role === "admin" || user.role === "staff";

// the unique activeKey index is the hard backstop for "one live referral per
// (mjakazi, employer)" — a concurrent duplicate invite fails here
const isDuplicateActiveKeyError = (error: unknown): boolean =>
	error instanceof ValidationError &&
	Boolean(error.data?.errors?.some((fieldError) => fieldError.path === "activeKey"));

// trusted read of the mjakazi profile's owner. explicit select — no contact or
// identity fields are read here
const loadProfileOwnerId = async (
	payload: Payload,
	profileId: string,
): Promise<string | null> => {
	try {
		const result = await payload.find({
			collection: "wajakazi-profiles",
			where: { id: { equals: profileId } },
			limit: 1,
			depth: 0,
			select: { user: true },
			overrideAccess: true,
		});
		return toId(result.docs[0]?.user);
	} catch {
		return null;
	}
};

const loadMjakaziName = async (payload: Payload, profileId: string): Promise<string> => {
	const display = await loadProfileDisplay(payload, [profileId]);
	return display.get(profileId)?.displayName ?? "A mjakazi";
};

// a mjakazi invites a former employer. the invite is bounded by the policy
// (outstanding cap, one live referral per employer, re-invite cooldown), lands
// as `invited`, and emails a single-use expiring link. no account is created for
// the referrer — the token is the whole capability
const inviteReferrer = async (
	payload: Payload,
	actor: User,
	input: InviteInput,
): Promise<Result<{ referralId: string }>> => {
	if (actor.role !== "mjakazi") return fail("Forbidden.", "forbidden");

	const profile = await getOwnProfile(payload, actor);
	if (!profile) return fail("Profile not found.", "not_found");

	const referrerName = input.referrerName.trim();
	const referrerEmail = normalizeEmail(input.referrerEmail);
	if (!referrerName) return fail("Enter the employer's name.", "invalid_name");
	if (!EMAIL_PATTERN.test(referrerEmail)) {
		return fail("Enter a valid email address.", "invalid_email");
	}

	const policy = await getReferralPolicy(payload);

	// cap the unanswered invites so an invite is deliberate, not sprayed. this is
	// best-effort: unlike the one-per-employer rule there is no unique key that can
	// back it, so two concurrent invites to different employers could each pass the
	// check and slightly exceed the cap. acceptable for a soft policy bound
	const outstanding = await payload.count({
		collection: "referrals",
		where: {
			and: [{ mjakazi: { equals: profile.id } }, { state: { equals: "invited" } }],
		},
		overrideAccess: true,
	});
	if (outstanding.totalDocs >= policy.maxOutstandingInvites) {
		return fail(
			`You can have at most ${policy.maxOutstandingInvites} invitations waiting at a time.`,
			"too_many_invites",
		);
	}

	// one live referral per employer — outstanding, pending or already published
	const existing = await payload.find({
		collection: "referrals",
		where: {
			and: [
				{ mjakazi: { equals: profile.id } },
				{ referrerEmail: { equals: referrerEmail } },
				{ state: { in: ["invited", "pending", "published"] } },
			],
		},
		limit: 1,
		depth: 0,
		overrideAccess: true,
	});
	if (existing.docs.length > 0) {
		const published = existing.docs[0].state === "published";
		return fail(
			published
				? "You already have a referral from this employer."
				: "You have already invited this employer.",
			published ? "already_referred" : "already_invited",
		);
	}

	// a recent expiry, rejection or withdrawal starts a re-invite cooldown
	if (policy.resendCooldownDays > 0) {
		const cutoff = new Date(
			Date.now() - policy.resendCooldownDays * DAY_MS,
		).toISOString();
		const cooling = await payload.find({
			collection: "referrals",
			where: {
				and: [
					{ mjakazi: { equals: profile.id } },
					{ referrerEmail: { equals: referrerEmail } },
					{ state: { in: ["rejected", "withdrawn", "expired"] } },
					{ updatedAt: { greater_than_equal: cutoff } },
				],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		if (cooling.docs.length > 0) {
			return fail(
				`You invited this employer recently. You can invite them again after the ${policy.resendCooldownDays}-day cooldown.`,
				"cooldown_active",
			);
		}
	}

	const token = createInviteToken();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + policy.inviteExpiryDays * DAY_MS);

	let referral: Referral;
	try {
		referral = await payload.create({
			collection: "referrals",
			data: {
				mjakazi: profile.id,
				referrerName,
				referrerEmail,
				role: input.role,
				startDate: input.startDate,
				endDate: input.endDate,
				state: "invited",
				activeKey: activeKeyFor(profile.id, referrerEmail),
				inviteTokenHash: hashToken(token),
				inviteExpiresAt: expiresAt.toISOString(),
				invitedAt: now.toISOString(),
			},
			overrideAccess: true,
		});
	} catch (error) {
		if (isDuplicateActiveKeyError(error)) {
			return fail("You have already invited this employer.", "already_invited");
		}
		console.error("[services/referral] invite create failed:", error);
		return fail("Could not create the invitation.");
	}

	await writeAuditLog({
		action: "referral_invited",
		actorId: actor.id,
		actorLabel: userLabel(actor),
		targetId: null,
		targetLabel: referrerName,
		previousState: null,
		newState: "invited",
		metadata: { referralId: String(referral.id), mjakaziProfileId: profile.id },
		source: "user",
	});

	// email failure never rolls back the invite — the worker can re-invite, and
	// the record is the source of truth
	try {
		await sendReferralInviteEmail({
			payload,
			to: referrerEmail,
			referrerName,
			mjakaziName: profile.displayName ?? "A mjakazi",
			roleLabel:
				JOB_OPTIONS.find((option) => option.value === input.role)?.label ?? input.role,
			inviteUrl: inviteUrlFor(token),
			expiresAt: expiresAt.toISOString(),
		});
	} catch (error) {
		console.error("[services/referral] invite email failed:", error);
	}

	return { success: true, data: { referralId: String(referral.id) } };
};

// resolves a raw invite token to the context the public page renders, or null
// when the token is unknown, already used, or past its expiry. no contact field
// is returned, and the employer's email is never included
const getReferralByToken = async (
	payload: Payload,
	token: string,
): Promise<ReferralInviteView | null> => {
	if (!token) return null;

	let referral: Referral | undefined;
	try {
		const result = await payload.find({
			collection: "referrals",
			where: { inviteTokenHash: { equals: hashToken(token) } },
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		referral = result.docs[0];
	} catch (error) {
		console.error("[services/referral] token lookup failed:", error);
		return null;
	}

	if (!referral || referral.state !== "invited") return null;
	if (
		!referral.inviteExpiresAt ||
		new Date(referral.inviteExpiresAt).getTime() <= Date.now()
	) {
		return null;
	}

	const mjakaziId = toId(referral.mjakazi);
	const mjakaziName = mjakaziId ? await loadMjakaziName(payload, mjakaziId) : "A mjakazi";

	return {
		referrerName: referral.referrerName,
		mjakaziName,
		role: referral.role,
		startDate: toDateOnly(referral.startDate),
		endDate: toDateOnly(referral.endDate),
	};
};

// the referrer submits through the public page. guarded on a live, unexpired,
// un-used token and a non-empty note; lands `pending` for staff moderation. the
// compare-and-swap pins `state === "invited"` so a double submit cannot apply
const submitReferral = async (payload: Payload, input: SubmitInput): Promise<Result> => {
	const token = input.token.trim();
	if (!token) return fail("This invitation is not valid.", "not_found");

	const note = input.note.trim();
	if (!note) return fail("Please write a short referral.", "invalid_note");
	if (note.length > REFERRAL_NOTE_MAX_LENGTH) {
		return fail("Your referral is too long.", "invalid_note");
	}

	let referral: Referral | undefined;
	try {
		const result = await payload.find({
			collection: "referrals",
			where: { inviteTokenHash: { equals: hashToken(token) } },
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		referral = result.docs[0];
	} catch (error) {
		console.error("[services/referral] submit lookup failed:", error);
		return fail("Could not submit your referral.");
	}

	if (!referral) return fail("This invitation is not valid.", "not_found");
	if (referral.state !== "invited") {
		return fail("This invitation has already been used.", "used");
	}
	if (
		!referral.inviteExpiresAt ||
		new Date(referral.inviteExpiresAt).getTime() <= Date.now()
	) {
		return fail("This invitation has expired.", "expired");
	}

	const referrerName = input.referrerName.trim();
	try {
		const updated = await payload.update({
			collection: "referrals",
			where: { and: [{ id: { equals: referral.id } }, { state: { equals: "invited" } }] },
			data: {
				state: "pending",
				note,
				submittedAt: new Date().toISOString(),
				referrerName,
				role: input.role,
				startDate: input.startDate,
				endDate: input.endDate,
			},
			overrideAccess: true,
		});
		if (updated.docs.length === 0) {
			return fail("This invitation has already been used.", "used");
		}
	} catch (error) {
		console.error("[services/referral] submit update failed:", error);
		return fail("Could not submit your referral.");
	}

	const mjakaziId = toId(referral.mjakazi);
	const ownerId = mjakaziId ? await loadProfileOwnerId(payload, mjakaziId) : null;

	await writeAuditLog({
		action: "referral_submitted",
		actorId: null,
		actorLabel: referrerName,
		targetId: ownerId,
		targetLabel: null,
		previousState: "invited",
		newState: "pending",
		metadata: { referralId: String(referral.id), mjakaziProfileId: mjakaziId },
		source: "user",
	});

	return { success: true, data: undefined };
};

// the mjakazi withdraws an invitation that has not yet been answered. only the
// `invited` state is withdrawable — once the referrer has submitted, the record
// is with staff, who can reject it
const withdrawInvite = async (
	payload: Payload,
	actor: User,
	referralId: string,
): Promise<Result> => {
	if (actor.role !== "mjakazi") return fail("Forbidden.", "forbidden");

	const profile = await getOwnProfile(payload, actor);
	if (!profile) return fail("Profile not found.", "not_found");

	let referral: Referral | undefined;
	try {
		referral = await payload.findByID({
			collection: "referrals",
			id: referralId,
			depth: 0,
			overrideAccess: true,
		});
	} catch {
		return fail("Invitation not found.", "not_found");
	}
	if (!referral) return fail("Invitation not found.", "not_found");
	if (toId(referral.mjakazi) !== profile.id) return fail("Forbidden.", "forbidden");
	if (referral.state !== "invited") {
		return fail(
			"You can only withdraw an invitation that has not been answered.",
			"not_withdrawable",
		);
	}

	try {
		const updated = await payload.update({
			collection: "referrals",
			where: { and: [{ id: { equals: referralId } }, { state: { equals: "invited" } }] },
			data: {
				state: "withdrawn",
				withdrawnAt: new Date().toISOString(),
				activeKey: freedKeyFor(profile.id, "withdrawn", referralId),
			},
			overrideAccess: true,
		});
		if (updated.docs.length === 0) {
			return fail("This invitation has already been answered.", "conflict");
		}
	} catch (error) {
		console.error("[services/referral] withdraw failed:", error);
		return fail("Could not withdraw the invitation.");
	}

	await writeAuditLog({
		action: "referral_withdrawn",
		actorId: actor.id,
		actorLabel: userLabel(actor),
		targetId: null,
		targetLabel: referral.referrerName,
		previousState: "invited",
		newState: "withdrawn",
		metadata: { referralId, mjakaziProfileId: profile.id },
		source: "user",
	});

	return { success: true, data: undefined };
};

// the referrals a mjakazi has sent or received, newest first, for their
// references page. the note is the worker's to read once it exists
const listMjakaziReferrals = async (
	payload: Payload,
	actor: User,
): Promise<Result<MjakaziReferralItem[]>> => {
	if (actor.role !== "mjakazi") return fail("Forbidden.", "forbidden");

	const profile = await getOwnProfile(payload, actor);
	if (!profile) return { success: true, data: [] };

	try {
		const result = await payload.find({
			collection: "referrals",
			where: { mjakazi: { equals: profile.id } },
			sort: "-createdAt",
			limit: 100,
			depth: 0,
			overrideAccess: true,
		});
		const data = result.docs.map((doc) => ({
			id: String(doc.id),
			referrerName: doc.referrerName,
			referrerEmail: doc.referrerEmail,
			role: doc.role,
			startDate: doc.startDate ?? null,
			endDate: doc.endDate ?? null,
			note: doc.note ?? null,
			state: doc.state,
			invitedAt: doc.invitedAt ?? null,
			submittedAt: doc.submittedAt ?? null,
			publishedAt: doc.publishedAt ?? null,
			inviteExpiresAt: doc.inviteExpiresAt ?? null,
			rejectionReason: doc.rejectionReason ?? null,
		}));
		return { success: true, data };
	} catch (error) {
		console.error("[services/referral] listMjakaziReferrals failed:", error);
		return fail("Could not load your referrals.");
	}
};

// the staff moderation queue — every submitted referral, oldest first
const listPendingReferrals = async (
	payload: Payload,
	actor: User,
): Promise<Result<PendingReferralItem[]>> => {
	if (!isBackOffice(actor)) return fail("Forbidden.", "forbidden");

	try {
		const result = await payload.find({
			collection: "referrals",
			where: { state: { equals: "pending" } },
			sort: "createdAt",
			limit: 100,
			depth: 0,
			overrideAccess: true,
		});

		const profileIds = result.docs
			.map((doc) => toId(doc.mjakazi))
			.filter((id): id is string => id !== null);
		const display = await loadProfileDisplay(payload, profileIds);

		const data = result.docs.map((doc) => {
			const profileId = toId(doc.mjakazi) ?? "";
			return {
				id: String(doc.id),
				referrerName: doc.referrerName,
				referrerEmail: doc.referrerEmail,
				mjakaziDisplayName: display.get(profileId)?.displayName ?? null,
				role: doc.role,
				startDate: doc.startDate ?? null,
				endDate: doc.endDate ?? null,
				note: doc.note ?? null,
				submittedAt: doc.submittedAt ?? null,
			};
		});
		return { success: true, data };
	} catch (error) {
		console.error("[services/referral] listPendingReferrals failed:", error);
		return fail("Could not load the referral queue.");
	}
};

// pending → published. staff/admin only. the active key is left intact so the
// pair stays closed — the employer cannot be invited again while published
const publishReferral = async (
	payload: Payload,
	actor: User,
	referralId: string,
): Promise<Result<Referral>> => {
	if (!isBackOffice(actor)) return fail("Forbidden.", "forbidden");

	let published: Referral | undefined;
	try {
		const result = await payload.update({
			collection: "referrals",
			where: { and: [{ id: { equals: referralId } }, { state: { equals: "pending" } }] },
			data: {
				state: "published",
				publishedAt: new Date().toISOString(),
				reviewedBy: actor.id,
			},
			overrideAccess: true,
		});
		published = result.docs[0];
	} catch (error) {
		console.error("[services/referral] publishReferral failed:", error);
		return fail("Could not publish the referral.");
	}
	if (!published) return fail("Referral not found.", "not_found");

	const mjakaziId = toId(published.mjakazi);
	const ownerId = mjakaziId ? await loadProfileOwnerId(payload, mjakaziId) : null;

	await writeAuditLog({
		action: "referral_published",
		actorId: actor.id,
		actorLabel: userLabel(actor),
		targetId: ownerId,
		targetLabel: null,
		previousState: "pending",
		newState: "published",
		metadata: { referralId, mjakaziProfileId: mjakaziId },
		source: "user",
	});

	// the profile's public reference count moves with the published set
	if (mjakaziId) await recomputeReferralCount(payload, mjakaziId);

	if (ownerId) {
		try {
			const recipient = await loadUserEmail(payload, ownerId);
			if (recipient) {
				await sendReferralPublishedEmail({
					payload,
					to: recipient.email,
					firstName: recipient.firstName,
					referrerName: published.referrerName,
				});
			}
		} catch (error) {
			console.error("[services/referral] published email failed:", error);
		}
	}

	return { success: true, data: published };
};

// pending → rejected (a moderation decline) or published → rejected (a staff
// takedown of a live referral), both terminal. staff/admin only; a reason is
// mandatory. the key is freed so the employer can be invited again once the
// cooldown passes
const rejectReferral = async (
	payload: Payload,
	actor: User,
	referralId: string,
	reason: string,
): Promise<Result<Referral>> => {
	if (!isBackOffice(actor)) return fail("Forbidden.", "forbidden");
	const trimmed = reason.trim();
	if (!trimmed) return fail("A rejection reason is required.", "invalid_reason");

	let existing: Referral | undefined;
	try {
		existing = await payload.findByID({
			collection: "referrals",
			id: referralId,
			depth: 0,
			overrideAccess: true,
		});
	} catch {
		return fail("Referral not found.", "not_found");
	}
	if (!existing) return fail("Referral not found.", "not_found");
	if (existing.state !== "pending" && existing.state !== "published") {
		return fail("This referral can no longer be rejected.", "not_rejectable");
	}

	const previousState = existing.state;
	const mjakaziId = toId(existing.mjakazi);

	try {
		const result = await payload.update({
			collection: "referrals",
			where: {
				and: [
					{ id: { equals: referralId } },
					{ state: { in: ["pending", "published"] } },
				],
			},
			data: {
				state: "rejected",
				rejectionReason: trimmed,
				rejectedAt: new Date().toISOString(),
				reviewedBy: actor.id,
				...(mjakaziId
					? { activeKey: freedKeyFor(mjakaziId, "rejected", referralId) }
					: {}),
			},
			overrideAccess: true,
		});
		const rejected = result.docs[0];
		if (!rejected) return fail("Referral not found.", "not_found");

		const ownerId = mjakaziId ? await loadProfileOwnerId(payload, mjakaziId) : null;
		await writeAuditLog({
			action: "referral_rejected",
			actorId: actor.id,
			actorLabel: userLabel(actor),
			targetId: ownerId,
			targetLabel: null,
			previousState,
			newState: "rejected",
			reason: trimmed,
			metadata: { referralId, mjakaziProfileId: mjakaziId },
			source: "user",
		});

		// a takedown of a published referral also moves the public count
		if (mjakaziId) await recomputeReferralCount(payload, mjakaziId);

		return { success: true, data: rejected };
	} catch (error) {
		console.error("[services/referral] rejectReferral failed:", error);
		return fail("Could not reject the referral.");
	}
};

// polled daily by the referral-expiry job. finds unanswered (invited) referrals
// past their invite expiry and expires each idempotently, freeing the pair key so
// the employer can be invited again once the cooldown passes. mirrors the EOI
// sweep — the CAS pins `state === "invited"` so a referral answered at the same
// moment is never clobbered
const expireStaleInvites = async (payload: Payload): Promise<{ expired: number }> => {
	let candidates: Referral[];
	try {
		const result = await payload.find({
			collection: "referrals",
			where: { state: { equals: "invited" } },
			limit: 200,
			depth: 0,
			overrideAccess: true,
		});
		candidates = result.docs;
	} catch (error) {
		console.error("[services/referral] expiry lookup failed:", error);
		return { expired: 0 };
	}

	const now = Date.now();
	let expired = 0;

	for (const referral of candidates) {
		if (!referral.inviteExpiresAt) continue;
		if (new Date(referral.inviteExpiresAt).getTime() > now) continue;

		const mjakaziId = toId(referral.mjakazi);
		try {
			const result = await payload.update({
				collection: "referrals",
				where: {
					and: [{ id: { equals: referral.id } }, { state: { equals: "invited" } }],
				},
				data: {
					state: "expired",
					expiredAt: new Date().toISOString(),
					...(mjakaziId
						? { activeKey: freedKeyFor(mjakaziId, "expired", String(referral.id)) }
						: {}),
				},
				overrideAccess: true,
			});
			if (result.docs.length === 0) continue;
		} catch (error) {
			console.error("[services/referral] expiry CAS failed:", error);
			continue;
		}

		const ownerId = mjakaziId ? await loadProfileOwnerId(payload, mjakaziId) : null;
		await writeAuditLog({
			action: "referral_expired",
			targetId: ownerId,
			targetLabel: null,
			previousState: "invited",
			newState: "expired",
			metadata: { referralId: String(referral.id), mjakaziProfileId: mjakaziId },
			source: "system",
		});

		expired += 1;
	}

	return { expired };
};

// called after a referral is published, or a published one is taken down — the
// only transitions that change the published set. denormalized onto the profile
// so the public cue needs no aggregation at request time, mirroring
// review.service.recomputeProfileRating
const recomputeReferralCount = async (
	payload: Payload,
	mjakaziId: string,
): Promise<void> => {
	try {
		const result = await payload.count({
			collection: "referrals",
			where: {
				and: [{ mjakazi: { equals: mjakaziId } }, { state: { equals: "published" } }],
			},
			overrideAccess: true,
		});

		await payload.update({
			collection: "wajakazi-profiles",
			id: mjakaziId,
			data: { referralCount: result.totalDocs },
			overrideAccess: true,
		});
	} catch (error) {
		console.error("[services/referral] recomputeReferralCount failed:", error);
	}
};

export {
	expireStaleInvites,
	getReferralByToken,
	inviteReferrer,
	listMjakaziReferrals,
	listPendingReferrals,
	publishReferral,
	rejectReferral,
	submitReferral,
	withdrawInvite,
};
export type {
	InviteInput,
	MjakaziReferralItem,
	PendingReferralItem,
	ReferralInviteView,
	ReferralState,
	SubmitInput,
};
