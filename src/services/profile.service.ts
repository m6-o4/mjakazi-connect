import type { Payload } from "payload";

import { normalizeKenyanPhone } from "@/lib/phone";
import {
	PROFILE_REQUIRED_FIELDS,
	type ProfileRequiredField,
} from "@/lib/profile-constants";
import type { ProfileFormValues } from "@/lib/profile-schema";
import type {
	ProfilePhoto,
	User,
	WaajiriProfile,
	WajakaziProfile,
} from "@/payload-types";

type Result<T = void> =
	{ success: true; data: T } | { success: false; error: string; code?: string };

// a profile is complete only when every required field is populated. the rule is
// a single source of truth — this and the dashboard checklist both read
// PROFILE_REQUIRED_FIELDS, so they can never disagree
const isRequiredFieldComplete = (
	profile: WajakaziProfile,
	field: ProfileRequiredField,
): boolean => {
	switch (field) {
		case "photo":
			return Boolean(profile.photo);
		case "legalFirstName":
			return Boolean(profile.legalFirstName?.trim());
		case "legalLastName":
			return Boolean(profile.legalLastName?.trim());
		case "about":
			return Boolean(profile.about?.trim());
		case "jobsSkills":
			return Array.isArray(profile.jobsSkills) && profile.jobsSkills.length > 0;
		case "location":
			return Boolean(profile.location);
		case "workPreference":
			return Boolean(profile.workPreference);
		case "yearsExperience":
			return profile.yearsExperience !== null && profile.yearsExperience !== undefined;
		case "nationality":
			return Boolean(profile.nationality);
		case "languages":
			return Array.isArray(profile.languages) && profile.languages.length > 0;
		case "phone":
			return Boolean(profile.phone?.trim());
	}
};

const getMissingRequiredFields = (profile: WajakaziProfile): ProfileRequiredField[] =>
	PROFILE_REQUIRED_FIELDS.filter((field) => !isRequiredFieldComplete(profile, field));

const computeProfileComplete = (profile: WajakaziProfile): boolean =>
	getMissingRequiredFields(profile).length === 0;

// maps the validated form values onto payload field values. empty strings become
// null so that clearing a field actually clears it, rather than being skipped
const toProfileData = (input: ProfileFormValues) => ({
	displayName: input.displayName,
	legalFirstName: input.legalFirstName || null,
	legalLastName: input.legalLastName || null,
	dateOfBirth: input.dateOfBirth || null,
	nationality: input.nationality || null,
	maritalStatus: input.maritalStatus || null,
	religion: input.religion || null,
	phone: input.phone.trim() ? normalizeKenyanPhone(input.phone) : null,
	jobsSkills: input.jobsSkills,
	about: input.about || null,
	yearsExperience: input.yearsExperience ?? null,
	educationLevel: input.educationLevel || null,
	languages: input.languages,
	workPreference: input.workPreference || null,
	availableFrom: input.availableFrom || null,
	salaryMin: input.salaryMin ?? null,
	salaryMax: input.salaryMax ?? null,
	location: input.location || null,
});

// resolves the caller's own profile, respecting access control. only a mjakazi
// has a wajakazi profile to resolve
const getOwnProfile = async (
	payload: Payload,
	user: User,
): Promise<WajakaziProfile | null> => {
	if (user.role !== "mjakazi") return null;

	const result = await payload.find({
		collection: "wajakazi-profiles",
		where: { user: { equals: user.id } },
		limit: 1,
		overrideAccess: false,
		req: { user },
	});

	return result.docs[0] ?? null;
};

// resolves the caller's own waajiri profile, respecting access control. only a
// mwajiri has a waajiri profile to resolve
const getOwnWaajiriProfile = async (
	payload: Payload,
	user: User,
): Promise<WaajiriProfile | null> => {
	if (user.role !== "mwajiri") return null;

	const result = await payload.find({
		collection: "waajiri-profiles",
		where: { user: { equals: user.id } },
		limit: 1,
		overrideAccess: false,
		req: { user },
	});

	return result.docs[0] ?? null;
};

// persists a mwajiri's phone number (already normalized) so future purchases
// prefill it. best-effort — a failed write is reported but never blocks the
// purchase, because the phone has already been used for the stk push by then
const updateWaajiriPhone = async (
	payload: Payload,
	user: User,
	phone: string,
): Promise<Result> => {
	if (user.role !== "mwajiri") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	const profile = await getOwnWaajiriProfile(payload, user);
	if (!profile) {
		return { success: false, error: "Profile not found", code: "not_found" };
	}

	if (profile.phone === phone) {
		return { success: true, data: undefined };
	}

	try {
		await payload.update({
			collection: "waajiri-profiles",
			id: profile.id,
			data: { phone },
			overrideAccess: false,
			req: { user },
		});
		return { success: true, data: undefined };
	} catch (error) {
		console.error("[services/profile] updateWaajiriPhone failed:", error);
		return { success: false, error: "Could not save the phone number." };
	}
};

// writes the computed profileComplete flag. the flag is field-locked to
// staff/admin, so this is a trusted write of a server-computed value — the one
// field the owner is barred from setting directly
const writeCompleteness = async (
	payload: Payload,
	profile: WajakaziProfile,
): Promise<boolean> => {
	const profileComplete = computeProfileComplete(profile);

	await payload.update({
		collection: "wajakazi-profiles",
		id: profile.id,
		data: { profileComplete },
	});

	return profileComplete;
};

// saves a mjakazi's editable profile fields, recomputing completeness. user
// editable fields are written through access control so a mjakazi can never set
// verificationState or any other staff-only field
const updateProfile = async (
	payload: Payload,
	user: User,
	input: ProfileFormValues,
): Promise<Result<{ profile: WajakaziProfile; profileComplete: boolean }>> => {
	if (user.role !== "mjakazi") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	const profile = await getOwnProfile(payload, user);
	if (!profile) {
		return { success: false, error: "Profile not found", code: "not_found" };
	}

	const data = toProfileData(input);
	const wasVerified = profile.verificationState === "verified";
	// changing a verified worker's legal name invalidates the verification — the
	// name no longer matches the reviewed documents, so send it back for review
	const legalNameChanged =
		(data.legalFirstName ?? null) !== (profile.legalFirstName ?? null) ||
		(data.legalLastName ?? null) !== (profile.legalLastName ?? null);

	try {
		const updated = await payload.update({
			collection: "wajakazi-profiles",
			id: profile.id,
			data,
			overrideAccess: false,
			req: { user },
		});

		const profileComplete = await writeCompleteness(payload, updated);

		if (wasVerified && legalNameChanged) {
			// dynamic import keeps this module out of a static cycle with
			// verification.service, which imports getOwnProfile from here
			const { revertToReview } = await import("@/services/verification.service");
			const reverted = await revertToReview(payload, profile.id);
			if (!reverted.success) {
				console.warn(
					"[services/profile] reverification trigger failed:",
					reverted.error,
				);
			}
		}

		return {
			success: true,
			data: { profile: updated, profileComplete },
		};
	} catch (error) {
		console.error("[services/profile] updateProfile failed:", error);
		return { success: false, error: "Could not save your profile." };
	}
};

// uploads a photo, links it to the profile and deletes the previous one, then
// recomputes completeness. returns the new photo so the client can preview it
const uploadProfilePhoto = async (
	payload: Payload,
	user: User,
	file: { data: Buffer; mimetype: string; name: string; size: number },
): Promise<Result<{ photo: ProfilePhoto; profileComplete: boolean }>> => {
	if (user.role !== "mjakazi") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	const profile = await getOwnProfile(payload, user);
	if (!profile) {
		return { success: false, error: "Profile not found", code: "not_found" };
	}
	const wasVerified = profile.verificationState === "verified";

	try {
		const photo = await payload.create({
			collection: "profile-photos",
			data: { user: user.id, alt: "Profile photo" },
			file,
			overrideAccess: false,
			req: { user },
		});

		// remove the previous photo so storage does not accumulate orphans. a
		// failed deletion must not block the new upload
		const previousPhotoId =
			typeof profile.photo === "string" ? profile.photo : profile.photo?.id;
		if (previousPhotoId && previousPhotoId !== photo.id) {
			try {
				await payload.delete({
					collection: "profile-photos",
					id: previousPhotoId,
					overrideAccess: false,
					req: { user },
				});
			} catch (error) {
				console.warn("[services/profile] could not delete previous photo:", error);
			}
		}

		const updated = await payload.update({
			collection: "wajakazi-profiles",
			id: profile.id,
			data: { photo: photo.id },
			overrideAccess: false,
			req: { user },
		});

		const profileComplete = await writeCompleteness(payload, updated);

		// a verified worker's photo is part of the reviewed evidence — replacing
		// it sends the profile back for a free re-review
		if (wasVerified) {
			// dynamic import keeps this module out of a static cycle with
			// verification.service, which imports getOwnProfile from here
			const { revertToReview } = await import("@/services/verification.service");
			const reverted = await revertToReview(payload, profile.id);
			if (!reverted.success) {
				console.warn(
					"[services/profile] reverification trigger failed:",
					reverted.error,
				);
			}
		}

		return { success: true, data: { photo, profileComplete } };
	} catch (error) {
		console.error("[services/profile] uploadProfilePhoto failed:", error);
		return { success: false, error: "Could not upload the photo." };
	}
};

type AvailabilityStatus = "available" | "hired" | "on_break";

// flips the worker's directory visibility. available is the only state shown in
// the directory and archive; hired and on_break hide the profile
const updateAvailability = async (
	payload: Payload,
	user: User,
	status: AvailabilityStatus,
): Promise<Result<WajakaziProfile>> => {
	if (user.role !== "mjakazi") {
		return { success: false, error: "Forbidden", code: "forbidden" };
	}

	const profile = await getOwnProfile(payload, user);
	if (!profile) {
		return { success: false, error: "Profile not found", code: "not_found" };
	}

	try {
		const updated = await payload.update({
			collection: "wajakazi-profiles",
			id: profile.id,
			data: { availabilityStatus: status },
			overrideAccess: false,
			req: { user },
		});

		return { success: true, data: updated };
	} catch (error) {
		console.error("[services/profile] updateAvailability failed:", error);
		return { success: false, error: "Could not update your availability." };
	}
};

export {
	computeProfileComplete,
	getMissingRequiredFields,
	getOwnProfile,
	getOwnWaajiriProfile,
	updateAvailability,
	updateProfile,
	updateWaajiriPhone,
	uploadProfilePhoto,
};
