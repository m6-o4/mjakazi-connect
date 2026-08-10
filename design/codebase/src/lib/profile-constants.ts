// centralised option definitions for wajakazi profile fields
// used by both payload schema definitions and frontend form components
// to add new options: extend the relevant array and redeploy

export const JOB_OPTIONS = [
	{ label: "Nanny / Childcare", value: "nanny", icon: "👶" },
	{ label: "Housekeeping", value: "housekeeping", icon: "🏠" },
	{ label: "Chef / Cook", value: "chef", icon: "🍳" },
	{ label: "Driver", value: "driver", icon: "🚗" },
	{ label: "Gardener", value: "gardener", icon: "🌿" },
	{ label: "Caregiver (Elderly)", value: "caregiver", icon: "🤝" },
	{ label: "Laundry", value: "laundry", icon: "👕" },
	{ label: "Security / Guard", value: "security", icon: "🔒" },
	{ label: "Personal Assistant", value: "personal_assistant", icon: "📋" },
	{ label: "Tutor / Homework Help", value: "tutor", icon: "📚" },
] as const;

export const LANGUAGE_OPTIONS = [
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

export const COUNTRY_OPTIONS = [
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

export const RELIGION_OPTIONS = [
	{ label: "Christian", value: "christian" },
	{ label: "Muslim", value: "muslim" },
	{ label: "Hindu", value: "hindu" },
	{ label: "Other", value: "other" },
	{ label: "Prefer not to say", value: "prefer_not_to_say" },
] as const;

export const MARITAL_STATUS_OPTIONS = [
	{ label: "Single", value: "single" },
	{ label: "Married", value: "married" },
	{ label: "Divorced", value: "divorced" },
	{ label: "Widowed", value: "widowed" },
	{ label: "Prefer not to say", value: "prefer_not_to_say" },
] as const;

export const WORK_PREFERENCE_OPTIONS = [
	{ label: "Live-in", value: "live_in" },
	{ label: "Live-out", value: "live_out" },
	{ label: "Either", value: "either" },
] as const;

export const EDUCATION_LEVEL_OPTIONS = [
	{ label: "Primary School", value: "primary" },
	{ label: "Secondary School", value: "secondary" },
	{ label: "Post Secondary Certificate", value: "certificate" },
	{ label: "Diploma", value: "diploma" },
	{ label: "Bachelor's Degree", value: "degree" },
	{ label: "Postgraduate", value: "postgraduate" },
] as const;

export const LOCATION_OPTIONS = [
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

// type helpers for use in typescript throughout the codebase
export type JobValue = (typeof JOB_OPTIONS)[number]["value"];
export type LanguageValue = (typeof LANGUAGE_OPTIONS)[number]["value"];
export type CountryValue = (typeof COUNTRY_OPTIONS)[number]["value"];
export type ReligionValue = (typeof RELIGION_OPTIONS)[number]["value"];
export type MaritalStatusValue = (typeof MARITAL_STATUS_OPTIONS)[number]["value"];
export type WorkPreferenceValue = (typeof WORK_PREFERENCE_OPTIONS)[number]["value"];
export type EducationLevelValue = (typeof EDUCATION_LEVEL_OPTIONS)[number]["value"];
export type LocationValue = (typeof LOCATION_OPTIONS)[number]["value"];

// fields required for profileComplete = true
// used by computeProfileComplete utility and the dashboard checklist
export const PROFILE_REQUIRED_FIELDS = [
	"photo",
	"legalFirstName",
	"legalLastName",
	"bio",
	"jobs",
	"location",
	"workPreference",
	"experience",
	"nationality",
	"languages",
] as const;
