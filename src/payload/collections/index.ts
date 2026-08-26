import { AuditLogs } from "@/payload/collections/audit-logs/schema";
import { CallsToAction } from "@/payload/collections/calls-to-action/schema";
import { Categories } from "@/payload/collections/categories/schema";
import { Media } from "@/payload/collections/media/schema";
import { Pages } from "@/payload/collections/pages/schema";
import { Posts } from "@/payload/collections/posts/schema";
import { Users } from "@/payload/collections/users/schema";

const collections = [Media, Pages, Posts, Categories, CallsToAction, Users, AuditLogs];

export { collections };
