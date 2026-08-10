import { Accounts } from "@/payload/collections/accounts/schema";
import { AuditLogs } from "@/payload/collections/audit-logs/schema";
import { CallsToAction } from "@/payload/collections/calls-to-action/schema";
import { Categories } from "@/payload/collections/categories/schema";
import { ExpressionsOfInterest } from "@/payload/collections/expressions-of-interest/schema";
import { Media } from "@/payload/collections/media/schema";
import { Pages } from "@/payload/collections/pages/schema";
import { Payments } from "@/payload/collections/payments/schema";
import { Posts } from "@/payload/collections/posts/schema";
import { Users } from "@/payload/collections/users/schema";
import { Vault } from "@/payload/collections/vault/schema";
import { WaajiriProfiles } from "@/payload/collections/waajiri-profiles/schema";
import { WajakaziProfiles } from "@/payload/collections/wajakazi-profiles/schema";
import { Subscriptions } from "@/payload/collections/subscriptions/schema";

// central registry for all Payload collections used in the application
const collections = [
	Pages,
	Posts,
	CallsToAction,
	Categories,
	Media,
	Accounts,
	Users,
	WaajiriProfiles,
	WajakaziProfiles,
	Vault,
	Payments,
	Subscriptions,
	ExpressionsOfInterest,
	AuditLogs,
];

export { collections };
