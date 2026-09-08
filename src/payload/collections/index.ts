import { AuditLogs } from "@/payload/collections/audit-logs/schema";
import { CallsToAction } from "@/payload/collections/calls-to-action/schema";
import { Categories } from "@/payload/collections/categories/schema";
import { ContactUnlocks } from "@/payload/collections/contact-unlocks/schema";
import { ExpressionsOfInterest } from "@/payload/collections/expressions-of-interest/schema";
import { Hires } from "@/payload/collections/hires/schema";
import { Media } from "@/payload/collections/media/schema";
import { Pages } from "@/payload/collections/pages/schema";
import { Payments } from "@/payload/collections/payments/schema";
import { Posts } from "@/payload/collections/posts/schema";
import { ProfilePhotos } from "@/payload/collections/profile-photos/schema";
import { Reviews } from "@/payload/collections/reviews/schema";
import { SavedWajakazi } from "@/payload/collections/saved-wajakazi/schema";
import { Subscriptions } from "@/payload/collections/subscriptions/schema";
import { Users } from "@/payload/collections/users/schema";
import { VaultDocuments } from "@/payload/collections/vault-documents/schema";
import { WaajiriProfiles } from "@/payload/collections/waajiri-profiles/schema";
import { WajakaziProfiles } from "@/payload/collections/wajakazi-profiles/schema";

const collections = [
	Media,
	Pages,
	Posts,
	Categories,
	CallsToAction,
	Users,
	AuditLogs,
	WajakaziProfiles,
	WaajiriProfiles,
	ProfilePhotos,
	VaultDocuments,
	Payments,
	Subscriptions,
	SavedWajakazi,
	ContactUnlocks,
	ExpressionsOfInterest,
	Hires,
	Reviews,
];

export { collections };
