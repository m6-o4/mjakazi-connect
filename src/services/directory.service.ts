import type { Payload, Where } from "payload";
import { z } from "zod";

import { DIRECTORY_VISIBLE } from "@/payload/access/access-control";
import type { WajakaziProfile } from "@/payload-types";

const DIRECTORY_PAGE_SIZE = 9;

// the only fields a public directory response may contain. contact (phone) and
// sensitive identity fields (legal name, date of birth, nationality, marital
// status, religion) are deliberately absent — this is the payload-level
// enforcement of invariant #14, not a UI mask
const DIRECTORY_PUBLIC_FIELDS = {
	slug: true,
	displayName: true,
	photo: true,
	jobsSkills: true,
	about: true,
	yearsExperience: true,
	educationLevel: true,
	languages: true,
	workPreference: true,
	availableFrom: true,
	salaryMin: true,
	salaryMax: true,
	location: true,
} as const;

const EXPERIENCE_BUCKETS = ["0-2", "3-5", "6-9", "10+"] as const;

type ExperienceBucket = (typeof EXPERIENCE_BUCKETS)[number];

// the shape a directory read returns — exactly the fields in
// DIRECTORY_PUBLIC_FIELDS, nothing else. this is the type the public pages see,
// so a contact or sensitive field can never appear in it
type DirectoryProfile = Pick<
	WajakaziProfile,
	| "id"
	| "displayName"
	| "slug"
	| "photo"
	| "jobsSkills"
	| "about"
	| "yearsExperience"
	| "educationLevel"
	| "languages"
	| "workPreference"
	| "availableFrom"
	| "salaryMin"
	| "salaryMax"
	| "location"
>;

// boundary validation for the directory query params. values are validated
// before they ever reach a database query, and an invalid value falls back to
// "no filter" rather than erroring the page
const directoryQuerySchema = z.object({
	category: z.string().max(64).optional(),
	location: z.string().max(64).optional(),
	experience: z.enum(EXPERIENCE_BUCKETS).optional(),
	q: z.string().max(120).optional(),
	page: z.coerce.number().int().min(1).optional(),
});

type DirectoryQuery = {
	category?: string;
	location?: string;
	experience?: ExperienceBucket;
	q?: string;
	page?: number;
};

const experienceWhere = (bucket: ExperienceBucket): Where => {
	switch (bucket) {
		case "0-2":
			return { yearsExperience: { less_than_equal: 2 } };
		case "3-5":
			return { yearsExperience: { greater_than_equal: 3, less_than_equal: 5 } };
		case "6-9":
			return { yearsExperience: { greater_than_equal: 6, less_than_equal: 9 } };
		case "10+":
			return { yearsExperience: { greater_than_equal: 10 } };
	}
};

// the public directory list — newest verified first, filtered, paginated, and
// read through the guarded path (DIRECTORY_VISIBLE + overrideAccess: false +
// explicit select) so contact fields never leave the service
const listDirectoryProfiles = async (payload: Payload, query: DirectoryQuery) => {
	const { category, location, experience, q, page = 1 } = query;

	const filters: Where[] = [DIRECTORY_VISIBLE];
	if (category) filters.push({ jobsSkills: { equals: category } });
	if (location) filters.push({ location: { equals: location } });
	if (experience) filters.push(experienceWhere(experience));
	if (q) filters.push({ displayName: { contains: q } });

	const result = await payload.find({
		collection: "wajakazi-profiles",
		where: { and: filters },
		depth: 1,
		page,
		limit: DIRECTORY_PAGE_SIZE,
		sort: "-verificationReviewedAt",
		select: DIRECTORY_PUBLIC_FIELDS,
		overrideAccess: false,
	});

	return result;
};

// a single public profile by slug. returns null when the slug is unknown OR the
// profile has since left the directory (hired, on a break, expired), so a stale
// shared link resolves to a 404 rather than a stale page
const getDirectoryProfile = async (
	payload: Payload,
	slug: string,
): Promise<DirectoryProfile | null> => {
	const result = await payload.find({
		collection: "wajakazi-profiles",
		where: { and: [DIRECTORY_VISIBLE, { slug: { equals: slug } }] },
		depth: 1,
		limit: 1,
		select: DIRECTORY_PUBLIC_FIELDS,
		overrideAccess: false,
	});

	return result.docs[0] ?? null;
};

export {
	DIRECTORY_PAGE_SIZE,
	EXPERIENCE_BUCKETS,
	directoryQuerySchema,
	getDirectoryProfile,
	listDirectoryProfiles,
};

export type { DirectoryProfile, DirectoryQuery, ExperienceBucket };
