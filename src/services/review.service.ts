import type { Payload } from "payload";

import { writeAuditLog } from "@/lib/audit";
import { loadProfileDisplay, toId, userLabel } from "@/lib/payload-helpers";
import type { Review, User } from "@/payload-types";
import { hasUnlock } from "@/services/contact.service";
import { getOwnProfile } from "@/services/profile.service";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

type ReviewState = NonNullable<Review["state"]>;

type PendingReviewItem = {
	id: string;
	reviewerName: string | null;
	rating: number;
	comment: string;
	mjakaziDisplayName: string | null;
	submittedAt: string | null;
};

type WorkerReviewItem = {
	id: string;
	reviewerName: string | null;
	rating: number;
	comment: string;
	hidden: boolean;
	publishedAt: string | null;
};

type PublicReview = {
	reviewerName: string | null;
	rating: number;
	comment: string;
	publishedAt: string | null;
};

type PublicReviews = {
	average: number | null;
	count: number;
	reviews: PublicReview[];
};

type ReviewFormState = {
	eligible: boolean;
	existing: { rating: number; comment: string; state: ReviewState } | null;
};

const fail = (
	error: string,
	code?: string,
): { success: false; error: string; code?: string } => ({ success: false, error, code });

// "Jane K." — first name + last initial. a snapshot taken at submission so the
// public attribution survives account rename/erasure, and an email is never used
// as a fallback on a public surface
const reviewerNameFor = (user: User): string => {
	const first = user.firstName?.trim() ?? "";
	const last = user.lastName?.trim() ?? "";
	if (!first) return "A mwajiri";
	return last ? `${first} ${last[0]}.` : first;
};

// trusted read of the target profile's owner. explicit select — no contact or
// identity fields are read here
const loadProfileOwner = async (
	payload: Payload,
	profileId: string,
): Promise<{ ownerId: string | null }> => {
	try {
		const result = await payload.find({
			collection: "wajakazi-profiles",
			where: { id: { equals: profileId } },
			limit: 1,
			depth: 0,
			select: { user: true },
			overrideAccess: true,
		});
		const doc = result.docs[0];
		if (!doc) return { ownerId: null };
		return { ownerId: toId(doc.user) };
	} catch {
		return { ownerId: null };
	}
};

// whether a hire that actually happened exists for the pair — `agreed` (active)
// or `ended` (completed). a pending or reversed hire earns no review. this is the
// "actually hired" half of the review gate (the unlock is the other half)
const hasReviewableHire = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
): Promise<boolean> => {
	try {
		const result = await payload.find({
			collection: "hires",
			where: {
				and: [
					{ mwajiri: { equals: mwajiriId } },
					{ mjakazi: { equals: mjakaziId } },
					{ state: { in: ["agreed", "ended"] } },
				],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		return result.docs.length > 0;
	} catch {
		return false;
	}
};

// whether a review already exists for the pair — the one-per-pair rule
const findExistingReview = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziId: string,
): Promise<Review | null> => {
	try {
		const result = await payload.find({
			collection: "reviews",
			where: {
				and: [{ mwajiri: { equals: mwajiriId } }, { mjakazi: { equals: mjakaziId } }],
			},
			limit: 1,
			depth: 0,
			overrideAccess: true,
		});
		return result.docs[0] ?? null;
	} catch {
		return null;
	}
};

// what the browse detail renders for a given mwajiri + worker: either the form
// (eligible), their existing review, or nothing. the gate (unlock + agreed hire)
// is evaluated here so the page never re-implements it
const getReviewFormState = async (
	payload: Payload,
	user: User | null,
	mjakaziId: string,
): Promise<ReviewFormState> => {
	if (!user || user.role !== "mwajiri") return { eligible: false, existing: null };

	const existing = await findExistingReview(payload, user.id, mjakaziId);
	if (existing) {
		return {
			eligible: false,
			existing: {
				rating: existing.rating,
				comment: existing.comment,
				state: existing.state,
			},
		};
	}

	const unlocked = await hasUnlock(payload, user, mjakaziId);
	const hired = unlocked ? await hasReviewableHire(payload, user.id, mjakaziId) : false;

	return { eligible: unlocked && hired, existing: null };
};

// a mwajiri leaves one review of a worker they unlocked and hired. the write is
// gated on role + unlock + agreed hire + no existing review, and lands in
// `pending` for moderation
const submitReview = async (
	payload: Payload,
	user: User,
	mjakaziId: string,
	input: { rating: number; comment: string },
): Promise<Result<Review>> => {
	if (user.role !== "mwajiri") return fail("Forbidden.", "forbidden");
	if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
		return fail("Rating must be between 1 and 5.", "invalid_rating");
	}
	const comment = input.comment.trim();
	if (!comment) return fail("Write a short comment.", "invalid_comment");

	const { ownerId } = await loadProfileOwner(payload, mjakaziId);
	if (!ownerId) return fail("Profile not found.", "not_found");

	if (!(await hasUnlock(payload, user, mjakaziId))) {
		return fail(
			"You can only review a wajakazi whose contact you have unlocked.",
			"not_unlocked",
		);
	}
	if (!(await hasReviewableHire(payload, user.id, mjakaziId))) {
		return fail("You can only review a wajakazi you have hired.", "not_hired");
	}
	if (await findExistingReview(payload, user.id, mjakaziId)) {
		return fail("You have already reviewed this wajakazi.", "already_reviewed");
	}

	let review: Review;
	try {
		review = await payload.create({
			collection: "reviews",
			data: {
				mwajiri: user.id,
				mjakazi: mjakaziId,
				reviewerName: reviewerNameFor(user),
				rating: input.rating,
				comment,
				state: "pending",
			},
			overrideAccess: true,
		});
	} catch (error) {
		// the unique [mwajiri, mjakazi] index rejects a concurrent double-submit —
		// surface it as "already reviewed" rather than a raw failure
		console.error("[services/review] create failed:", error);
		return fail("You have already reviewed this wajakazi.", "already_reviewed");
	}

	await writeAuditLog({
		action: "review_submitted",
		actorId: user.id,
		actorLabel: userLabel(user),
		targetId: ownerId,
		metadata: { reviewId: String(review.id), mjakaziId, rating: input.rating },
		previousState: null,
		newState: "pending",
		source: "user",
	});

	return { success: true, data: review };
};

// the staff moderation queue — every pending review, oldest first
const listPendingReviews = async (
	payload: Payload,
	user: User,
): Promise<Result<PendingReviewItem[]>> => {
	if (user.role !== "admin" && user.role !== "staff")
		return fail("Forbidden.", "forbidden");

	try {
		const result = await payload.find({
			collection: "reviews",
			where: { state: { equals: "pending" } },
			limit: 100,
			sort: "createdAt",
			depth: 0,
			overrideAccess: true,
		});

		const profileIds = result.docs
			.map((review) => toId(review.mjakazi))
			.filter((id): id is string => id !== null);
		const display = await loadProfileDisplay(payload, profileIds);

		const items = result.docs.map((review) => {
			const profileId = toId(review.mjakazi) ?? "";
			return {
				id: String(review.id),
				reviewerName: review.reviewerName ?? null,
				rating: review.rating,
				comment: review.comment,
				mjakaziDisplayName: display.get(profileId)?.displayName ?? null,
				submittedAt: review.createdAt ?? null,
			};
		});

		return { success: true, data: items };
	} catch (error) {
		console.error("[services/review] listPendingReviews failed:", error);
		return fail("Could not load the review queue.");
	}
};

// pending → published. staff/admin only; the review becomes visible on the
// worker's public profile (unless the worker later hides it)
const approveReview = async (
	payload: Payload,
	user: User,
	reviewId: string,
): Promise<Result<Review>> => {
	if (user.role !== "admin" && user.role !== "staff")
		return fail("Forbidden.", "forbidden");

	try {
		const result = await payload.update({
			collection: "reviews",
			where: { and: [{ id: { equals: reviewId } }, { state: { equals: "pending" } }] },
			data: { state: "published", reviewedAt: new Date().toISOString() },
			overrideAccess: true,
		});
		const review = result.docs[0];
		if (!review) return fail("Review not found.", "not_found");

		await writeAuditLog({
			action: "review_published",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: toId(review.mwajiri),
			metadata: { reviewId, mjakaziId: toId(review.mjakazi), rating: review.rating },
			previousState: "pending",
			newState: "published",
			source: "user",
		});

		return { success: true, data: review };
	} catch (error) {
		console.error("[services/review] approveReview failed:", error);
		return fail("Could not approve the review.");
	}
};

// pending → rejected, terminal. staff/admin only; a reason is mandatory
const rejectReview = async (
	payload: Payload,
	user: User,
	reviewId: string,
	reason: string,
): Promise<Result<Review>> => {
	if (user.role !== "admin" && user.role !== "staff")
		return fail("Forbidden.", "forbidden");
	const trimmed = reason.trim();
	if (!trimmed) return fail("A rejection reason is required.", "invalid_reason");

	try {
		const result = await payload.update({
			collection: "reviews",
			where: { and: [{ id: { equals: reviewId } }, { state: { equals: "pending" } }] },
			data: {
				state: "rejected",
				rejectionReason: trimmed,
				reviewedAt: new Date().toISOString(),
			},
			overrideAccess: true,
		});
		const review = result.docs[0];
		if (!review) return fail("Review not found.", "not_found");

		await writeAuditLog({
			action: "review_rejected",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: toId(review.mwajiri),
			metadata: { reviewId, mjakaziId: toId(review.mjakazi), rating: review.rating },
			previousState: "pending",
			newState: "rejected",
			reason: trimmed,
			source: "user",
		});

		return { success: true, data: review };
	} catch (error) {
		console.error("[services/review] rejectReview failed:", error);
		return fail("Could not reject the review.");
	}
};

// toggles whether a published review appears on the worker's public profile.
// the worker owns this — it never changes the review's published state and is
// not a moderation action
const setReviewVisibility = async (
	payload: Payload,
	user: User,
	reviewId: string,
	hidden: boolean,
): Promise<Result<Review>> => {
	if (user.role !== "mjakazi") return fail("Forbidden.", "forbidden");

	const profile = await getOwnProfile(payload, user);
	if (!profile) return fail("Profile not found.", "not_found");

	try {
		const result = await payload.update({
			collection: "reviews",
			where: {
				and: [
					{ id: { equals: reviewId } },
					{ mjakazi: { equals: profile.id } },
					{ state: { equals: "published" } },
				],
			},
			data: { hiddenByWorker: hidden },
			overrideAccess: true,
		});
		const review = result.docs[0];
		if (!review) return fail("Review not found.", "not_found");

		await writeAuditLog({
			action: hidden ? "review_hidden" : "review_shown",
			actorId: user.id,
			actorLabel: userLabel(user),
			targetId: toId(review.mwajiri),
			metadata: { reviewId, rating: review.rating },
			previousState: hidden ? "visible" : "hidden",
			newState: hidden ? "hidden" : "visible",
			source: "user",
		});

		return { success: true, data: review };
	} catch (error) {
		console.error("[services/review] setReviewVisibility failed:", error);
		return fail("Could not update the review.");
	}
};

// the worker's own published reviews — shown and hidden — so they can learn from
// all of them and choose what the public sees
const listWorkerReviews = async (
	payload: Payload,
	user: User,
): Promise<Result<WorkerReviewItem[]>> => {
	if (user.role !== "mjakazi") return fail("Forbidden.", "forbidden");

	const profile = await getOwnProfile(payload, user);
	if (!profile) return fail("Profile not found.", "not_found");

	try {
		const result = await payload.find({
			collection: "reviews",
			where: {
				and: [{ mjakazi: { equals: profile.id } }, { state: { equals: "published" } }],
			},
			sort: "-createdAt",
			limit: 50,
			depth: 0,
			overrideAccess: true,
		});
		const items = result.docs.map((review) => ({
			id: String(review.id),
			reviewerName: review.reviewerName ?? null,
			rating: review.rating,
			comment: review.comment,
			hidden: review.hiddenByWorker ?? false,
			publishedAt: review.reviewedAt ?? review.createdAt ?? null,
		}));
		return { success: true, data: items };
	} catch (error) {
		console.error("[services/review] listWorkerReviews failed:", error);
		return fail("Could not load your reviews.");
	}
};

// published, worker-visible reviews for a profile, plus the public aggregate.
// hidden reviews are excluded from both — the aggregate reflects only what the
// worker chose to show
const getPublicReviews = async (
	payload: Payload,
	profileId: string,
): Promise<PublicReviews> => {
	try {
		const result = await payload.find({
			collection: "reviews",
			where: {
				and: [
					{ mjakazi: { equals: profileId } },
					{ state: { equals: "published" } },
					{ hiddenByWorker: { not_equals: true } },
				],
			},
			sort: "-reviewedAt",
			limit: 50,
			depth: 0,
			overrideAccess: true,
		});

		const reviews = result.docs.map((review) => ({
			reviewerName: review.reviewerName ?? null,
			rating: review.rating,
			comment: review.comment,
			publishedAt: review.reviewedAt ?? review.createdAt ?? null,
		}));

		const count = reviews.length;
		const average =
			count > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : null;

		return { average, count, reviews };
	} catch (error) {
		console.error("[services/review] getPublicReviews failed:", error);
		return { average: null, count: 0, reviews: [] };
	}
};

// which of the given mjakazi profiles this mwajiri has already reviewed — used by
// the mwajiri overview to decide between "end contract", "leave a review" and
// "reviewed"
const listReviewedMjakaziIds = async (
	payload: Payload,
	mwajiriId: string,
	mjakaziIds: string[],
): Promise<Set<string>> => {
	if (mjakaziIds.length === 0) return new Set();
	try {
		const result = await payload.find({
			collection: "reviews",
			where: {
				and: [{ mwajiri: { equals: mwajiriId } }, { mjakazi: { in: mjakaziIds } }],
			},
			limit: mjakaziIds.length,
			depth: 0,
			select: { mjakazi: true },
			overrideAccess: true,
		});
		return new Set(
			result.docs
				.map((doc) => toId(doc.mjakazi))
				.filter((id): id is string => id !== null),
		);
	} catch {
		return new Set();
	}
};

export {
	approveReview,
	getPublicReviews,
	getReviewFormState,
	listPendingReviews,
	listReviewedMjakaziIds,
	listWorkerReviews,
	rejectReview,
	setReviewVisibility,
	submitReview,
};
export type {
	PendingReviewItem,
	PublicReview,
	PublicReviews,
	ReviewFormState,
	WorkerReviewItem,
};
