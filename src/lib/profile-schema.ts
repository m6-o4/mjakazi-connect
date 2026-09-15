import { z } from "zod";

import { isValidKenyanPhone } from "@/lib/phone";
import {
	COUNTRY_OPTIONS,
	EDUCATION_LEVEL_OPTIONS,
	EMPLOYER_MAX_LENGTH,
	JOB_OPTIONS,
	LANGUAGE_OPTIONS,
	LOCATION_OPTIONS,
	MARITAL_STATUS_OPTIONS,
	MAX_EMPLOYMENT_ENTRIES,
	RELIGION_OPTIONS,
	WORK_PREFERENCE_OPTIONS,
	type JobValue,
} from "@/lib/profile-constants";

// word limit for the "about" field — one source for the schema check and the
// form's live counter
const ABOUT_MAX_WORDS = 200;

const countWords = (value: string): number =>
	value.trim() === "" ? 0 : value.trim().split(/\s+/).length;

// the employer descriptor is published on the public profile, so it must not
// become a second route to contact details that the contact vault withholds.
// these match a Kenyan phone number or an email address anywhere in the text,
// rather than only as the whole value
const CONTACT_DETAIL_PATTERNS = [
	/(?:\+?254[\s.-]?|0)[17](?:[\s.-]?\d){8}/,
	/\S+@\S+\.\S+/,
];

const containsContactDetails = (value: string): boolean =>
	CONTACT_DETAIL_PATTERNS.some((pattern) => pattern.test(value));

// the employment checks compare calendar dates, so "today" has to be today in
// Nairobi rather than UTC — otherwise a start date picked today is rejected as
// being in the future between midnight and 3am local time
const nairobiToday = (): string => {
	const parts = new Intl.DateTimeFormat("en-CA", {
		timeZone: "Africa/Nairobi",
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(new Date());
	const part = (type: string): string =>
		parts.find((candidate) => candidate.type === type)?.value ?? "";

	return `${part("year")}-${part("month")}-${part("day")}`;
};

// maps an `as const` options array to the tuple shape z.enum expects, preserving
// the literal value types so the schema validates membership, not just shape
const enumOf = <const T extends readonly { value: string }[]>(options: T) =>
	options.map((o) => o.value) as unknown as [T[number]["value"], ...T[number]["value"][]];

// a select that may be empty: "" means "not set" and is dropped before storage
const emptyable = <const T extends readonly { value: string }[]>(options: T) =>
	z.enum(enumOf(options)).or(z.literal(""));

// one previous placement. every field may be empty here because a half-filled
// row the user abandoned is dropped rather than rejected — completeness for the
// row is enforced in the superRefine below, which skips a fully blank row
const employmentEntrySchema = z.object({
	employer: z
		.string()
		.trim()
		.max(EMPLOYER_MAX_LENGTH, {
			error: `Employer must be ${EMPLOYER_MAX_LENGTH} characters or fewer.`,
		})
		.refine((value) => !containsContactDetails(value), {
			error: "Do not include phone numbers or email addresses.",
		}),
	role: emptyable(JOB_OPTIONS),
	startDate: z.string(),
	endDate: z.string(),
});

type EmploymentEntryValues = z.infer<typeof employmentEntrySchema>;

// a row the user added but never filled in. the form does not send these and the
// service drops them before writing — the service reads the derived
// isFilledEmploymentEntry below, which is defined in terms of this predicate, so
// the two can never disagree about what counts as an omission
const isBlankEmploymentEntry = (entry: EmploymentEntryValues): boolean =>
	entry.employer === "" &&
	entry.role === "" &&
	entry.startDate === "" &&
	entry.endDate === "";

// a row worth storing. validation guarantees every field is filled once a row is
// not blank, so this narrows role from its empty placeholder to a real option —
// which is what the payload field accepts
const isFilledEmploymentEntry = (
	entry: EmploymentEntryValues,
): entry is EmploymentEntryValues & { role: JobValue } =>
	!isBlankEmploymentEntry(entry) && entry.role !== "";

// the shape of the profile form. shared by the client form (via zodResolver)
// and the server action (via safeParse), so client and server agree on what a
// valid profile looks like
const profileFormSchema = z
	.object({
		displayName: z.string().trim().min(1, { error: "Display name is required." }),
		legalFirstName: z.string().trim(),
		legalLastName: z.string().trim(),
		dateOfBirth: z.string(),
		nationality: emptyable(COUNTRY_OPTIONS),
		maritalStatus: emptyable(MARITAL_STATUS_OPTIONS),
		religion: emptyable(RELIGION_OPTIONS),
		phone: z
			.string()
			.trim()
			.refine((value) => value === "" || isValidKenyanPhone(value), {
				error: "Enter a valid Kenyan phone number, e.g. 0712 345 678.",
			}),
		jobsSkills: z.array(z.enum(enumOf(JOB_OPTIONS))),
		about: z
			.string()
			.trim()
			.refine((value) => countWords(value) <= ABOUT_MAX_WORDS, {
				error: `About me must be ${ABOUT_MAX_WORDS} words or fewer.`,
			}),
		yearsExperience: z.number().int().nonnegative().optional(),
		educationLevel: emptyable(EDUCATION_LEVEL_OPTIONS),
		// no default here on purpose: an omitted key is a loud validation failure,
		// whereas a default of [] would silently wipe existing entries on a save
		// from a client that did not send the field
		employmentHistory: z.array(employmentEntrySchema).max(MAX_EMPLOYMENT_ENTRIES, {
			error: `List no more than ${MAX_EMPLOYMENT_ENTRIES} previous placements.`,
		}),
		languages: z.array(z.enum(enumOf(LANGUAGE_OPTIONS))),
		workPreference: emptyable(WORK_PREFERENCE_OPTIONS),
		availableFrom: z.string(),
		salaryMin: z.number().int().nonnegative().optional(),
		salaryMax: z.number().int().nonnegative().optional(),
		location: emptyable(LOCATION_OPTIONS),
	})
	.superRefine((data, ctx) => {
		if (
			data.salaryMin !== undefined &&
			data.salaryMax !== undefined &&
			data.salaryMin > data.salaryMax
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				path: ["salaryMax"],
				message: "Maximum salary must be at least the minimum.",
			});
		}

		data.employmentHistory.forEach((entry, index) => {
			// an untouched row is an omission rather than a mistake, so it is dropped
			// on save instead of being reported as an error
			if (isBlankEmploymentEntry(entry)) return;

			const required: [keyof EmploymentEntryValues, string][] = [
				["employer", "Employer is required."],
				["role", "Role is required."],
				["startDate", "Start date is required."],
				["endDate", "End date is required."],
			];

			for (const [field, message] of required) {
				if (!entry[field]) {
					ctx.addIssue({
						code: z.ZodIssueCode.custom,
						path: ["employmentHistory", index, field],
						message,
					});
				}
			}

			if (entry.startDate && entry.startDate > nairobiToday()) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["employmentHistory", index, "startDate"],
					message: "Start date cannot be in the future.",
				});
			}

			if (entry.startDate && entry.endDate && entry.endDate < entry.startDate) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					path: ["employmentHistory", index, "endDate"],
					message: "End date must be on or after the start date.",
				});
			}
		});
	});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export { ABOUT_MAX_WORDS, countWords, isFilledEmploymentEntry, profileFormSchema };
export type { ProfileFormValues };
