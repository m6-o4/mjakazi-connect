// centralised option definitions for the wajakazi profile fields. used by both
// the payload schema and the frontend form, so the two can never drift.
// to add an option: extend the relevant array and redeploy — the schema and the
// form both read from here

const JOB_OPTIONS = [
	{ label: "Nanny / Childcare", value: "nanny" },
	{ label: "Housekeeping", value: "housekeeping" },
	{ label: "Chef / Cook", value: "chef" },
	{ label: "Driver", value: "driver" },
	{ label: "Gardener", value: "gardener" },
	{ label: "Caregiver (Elderly)", value: "caregiver" },
	{ label: "Laundry", value: "laundry" },
	{ label: "Security / Guard", value: "security" },
	{ label: "Personal Assistant", value: "personal_assistant" },
	{ label: "Tutor / Homework Help", value: "tutor" },
] as const;

const LANGUAGE_OPTIONS = [
	{ label: "English", value: "english" },
	{ label: "Kiswahili", value: "kiswahili" },
	{ label: "Kikuyu", value: "kikuyu" },
	{ label: "Luo", value: "luo" },
	{ label: "Kamba", value: "kamba" },
	{ label: "Luhya", value: "luhya" },
	{ label: "Kalenjin", value: "kalenjin" },
	{ label: "Meru", value: "meru" },
	{ label: "Kisii", value: "kisii" },
	{ label: "Mijikenda", value: "mijikenda" },
	{ label: "Luganda", value: "luganda" },
	{ label: "Kinyarwanda", value: "kinyarwanda" },
	{ label: "Kirundi", value: "kirundi" },
	{ label: "Lingala", value: "lingala" },
	{ label: "French", value: "french" },
	{ label: "Arabic", value: "arabic" },
	{ label: "Other", value: "other" },
] as const;

const COUNTRY_OPTIONS = [
	{ label: "Kenyan", value: "kenya" },
	{ label: "Ugandan", value: "uganda" },
	{ label: "Tanzanian", value: "tanzania" },
	{ label: "Rwandese", value: "rwanda" },
	{ label: "Burundian", value: "burundi" },
	{ label: "DR Congolese", value: "drc" },
	{ label: "Ethiopian", value: "ethiopia" },
	{ label: "Somali", value: "somalia" },
	{ label: "South Sudanese", value: "south_sudan" },
	{ label: "Sudanese", value: "sudan" },
	{ label: "Eritrean", value: "eritrea" },
	{ label: "Djiboutian", value: "djibouti" },
	{ label: "Other", value: "other" },
] as const;

const RELIGION_OPTIONS = [
	{ label: "Christian", value: "christian" },
	{ label: "Muslim", value: "muslim" },
	{ label: "Hindu", value: "hindu" },
	{ label: "Other", value: "other" },
	{ label: "Prefer not to say", value: "prefer_not_to_say" },
] as const;

const MARITAL_STATUS_OPTIONS = [
	{ label: "Single", value: "single" },
	{ label: "Married", value: "married" },
	{ label: "Divorced", value: "divorced" },
	{ label: "Widowed", value: "widowed" },
	{ label: "Prefer not to say", value: "prefer_not_to_say" },
] as const;

const WORK_PREFERENCE_OPTIONS = [
	{ label: "Live-in", value: "live_in" },
	{ label: "Live-out", value: "live_out" },
	{ label: "Either", value: "either" },
] as const;

const EDUCATION_LEVEL_OPTIONS = [
	{ label: "Primary School", value: "primary" },
	{ label: "Secondary School", value: "secondary" },
	{ label: "Post Secondary Certificate", value: "certificate" },
	{ label: "Diploma", value: "diploma" },
	{ label: "Bachelor's Degree", value: "degree" },
	{ label: "Postgraduate", value: "postgraduate" },
] as const;

const LOCATION_OPTIONS = [
	{ label: "Nairobi", value: "nairobi" },
	{ label: "Mombasa", value: "mombasa" },
	{ label: "Kisumu", value: "kisumu" },
	{ label: "Nakuru", value: "nakuru" },
	{ label: "Eldoret", value: "eldoret" },
	{ label: "Thika", value: "thika" },
	{ label: "Malindi", value: "malindi" },
	{ label: "Kitale", value: "kitale" },
	{ label: "Garissa", value: "garissa" },
	{ label: "Kakamega", value: "kakamega" },
	{ label: "Nyeri", value: "nyeri" },
	{ label: "Meru", value: "meru" },
	{ label: "Machakos", value: "machakos" },
	{ label: "Kericho", value: "kericho" },
	{ label: "Embu", value: "embu" },
	{ label: "Kilifi", value: "kilifi" },
	{ label: "Lamu", value: "lamu" },
	{ label: "Naivasha", value: "naivasha" },
	{ label: "Nanyuki", value: "nanyuki" },
	{ label: "Isiolo", value: "isiolo" },
	{ label: "Wajir", value: "wajir" },
	{ label: "Mandera", value: "mandera" },
	{ label: "Marsabit", value: "marsabit" },
	{ label: "Lodwar", value: "lodwar" },
	{ label: "Bungoma", value: "bungoma" },
	{ label: "Busia", value: "busia" },
	{ label: "Homa Bay", value: "homa_bay" },
	{ label: "Migori", value: "migori" },
	{ label: "Kisii", value: "kisii" },
	{ label: "Nyamira", value: "nyamira" },
	{ label: "Bomet", value: "bomet" },
	{ label: "Narok", value: "narok" },
	{ label: "Kajiado", value: "kajiado" },
	{ label: "Muranga", value: "muranga" },
	{ label: "Kiambu", value: "kiambu" },
	{ label: "Ruiru", value: "ruiru" },
	{ label: "Limuru", value: "limuru" },
	{ label: "Other", value: "other" },
] as const;

type OptionValue<T> = T extends readonly { value: infer V }[] ? V : never;

type JobValue = OptionValue<typeof JOB_OPTIONS>;
type LanguageValue = OptionValue<typeof LANGUAGE_OPTIONS>;
type CountryValue = OptionValue<typeof COUNTRY_OPTIONS>;
type ReligionValue = OptionValue<typeof RELIGION_OPTIONS>;
type MaritalStatusValue = OptionValue<typeof MARITAL_STATUS_OPTIONS>;
type WorkPreferenceValue = OptionValue<typeof WORK_PREFERENCE_OPTIONS>;
type EducationLevelValue = OptionValue<typeof EDUCATION_LEVEL_OPTIONS>;
type LocationValue = OptionValue<typeof LOCATION_OPTIONS>;

// the fields that must be populated for profileComplete to be true. this is the
// single source of truth — the compute function and the dashboard checklist both
// derive from it, so they can never disagree
const PROFILE_REQUIRED_FIELDS = [
	"photo",
	"legalFirstName",
	"legalLastName",
	"about",
	"jobsSkills",
	"location",
	"workPreference",
	"yearsExperience",
	"nationality",
	"languages",
	"phone",
] as const;

type ProfileRequiredField = (typeof PROFILE_REQUIRED_FIELDS)[number];

// friendly labels for the dashboard completeness checklist, in display order
const PROFILE_REQUIRED_LABELS: Record<ProfileRequiredField, string> = {
	photo: "Upload a profile photo",
	legalFirstName: "Legal first name",
	legalLastName: "Legal last name",
	about: "Write about yourself",
	jobsSkills: "Choose at least one job skill",
	location: "Set your location",
	workPreference: "Set your work preference",
	yearsExperience: "Add years of experience",
	nationality: "Select your nationality",
	languages: "Choose at least one language",
	phone: "Add your mobile phone number",
};

export {
	COUNTRY_OPTIONS,
	EDUCATION_LEVEL_OPTIONS,
	JOB_OPTIONS,
	LANGUAGE_OPTIONS,
	LOCATION_OPTIONS,
	MARITAL_STATUS_OPTIONS,
	PROFILE_REQUIRED_FIELDS,
	PROFILE_REQUIRED_LABELS,
	RELIGION_OPTIONS,
	WORK_PREFERENCE_OPTIONS,
};

export type {
	CountryValue,
	EducationLevelValue,
	JobValue,
	LanguageValue,
	LocationValue,
	MaritalStatusValue,
	ProfileRequiredField,
	ReligionValue,
	WorkPreferenceValue,
};
