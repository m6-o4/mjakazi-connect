import type { Payload } from "payload";

import {
	PROFILE_REQUIRED_FIELDS,
	type ProfileRequiredField,
} from "@/lib/profile-constants";
import { normalizeKenyanPhone } from "@/lib/phone";
import type { ProfileFormValues } from "@/lib/profile-schema";
import type { ProfilePhoto, User, WajakaziProfile } from "@/payload-types";

type Result<T = void> =
	| { success: true; data: T }
	| { success: false; error: string; code?: string };

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

	try {
		const updated = await payload.update({
			collection: "wajakazi-profiles",
			id: profile.id,
			data,
			overrideAccess: false,
			req: { user },
		});

		const profileComplete = await writeCompleteness(payload, updated);

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

		return { success: true, data: { photo, profileComplete } };
	} catch (error) {
		console.error("[services/profile] uploadProfilePhoto failed:", error);
		return { success: false, error: "Could not upload the photo." };
	}
};

export {
	computeProfileComplete,
	getMissingRequiredFields,
	getOwnProfile,
	updateProfile,
	uploadProfilePhoto,
};
