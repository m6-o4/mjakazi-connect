import { z } from "zod";

import {
	COUNTRY_OPTIONS,
	EDUCATION_LEVEL_OPTIONS,
	JOB_OPTIONS,
	LANGUAGE_OPTIONS,
	LOCATION_OPTIONS,
	MARITAL_STATUS_OPTIONS,
	RELIGION_OPTIONS,
	WORK_PREFERENCE_OPTIONS,
} from "@/lib/profile-constants";
import { isValidKenyanPhone } from "@/lib/phone";

// word limit for the "about" field — one source for the schema check and the
// form's live counter
const ABOUT_MAX_WORDS = 200;

const countWords = (value: string): number =>
	value.trim() === "" ? 0 : value.trim().split(/\s+/).length;

// maps an `as const` options array to the tuple shape z.enum expects, preserving
// the literal value types so the schema validates membership, not just shape
const enumOf = <const T extends readonly { value: string }[]>(options: T) =>
	options.map((o) => o.value) as unknown as [
		T[number]["value"],
		...T[number]["value"][],
	];

// a select that may be empty: "" means "not set" and is dropped before storage
const emptyable = <const T extends readonly { value: string }[]>(options: T) =>
	z.enum(enumOf(options)).or(z.literal(""));

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
	});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export { ABOUT_MAX_WORDS, countWords, profileFormSchema };
export type { ProfileFormValues };
