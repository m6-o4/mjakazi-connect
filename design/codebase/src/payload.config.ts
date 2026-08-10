import path from "path";
import { fileURLToPath } from "url";
import { globals } from "@/payload/blocks/globals";
import { collections } from "@/payload/collections";
import { Users } from "@/payload/collections/users/schema";
import { lexical } from "@/payload/fields/lexical";
import { resend } from "@/payload/fields/resend";
import { plugins } from "@/payload/plugins/schema";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { buildConfig, PayloadRequest } from "payload";
import sharp from "sharp";

// resolve the current file path and directory name for use in path resolution.
const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);
// construct the absolute url for the admin interface favicon/icon meta tag.
const iconURL = `${process.env.NEXT_PUBLIC_SERVER_URL}/api/media/file/${process.env.NEXT_PUBLIC_META_ICON}`;

// determine the current environment to select the appropriate database connection.
const isProduction = process.env.NODE_ENV === "production";
const databaseURI = isProduction
	? process.env.DATABASE_URI_PRD!
	: process.env.DATABASE_URI_DEV!;

export default buildConfig({
	admin: {
		components: {
			graphics: {
				// custom react components for the admin logo and icon.
				Logo: "/components/payload/logo/index.tsx#Logo",
				Icon: "/components/payload/icon/index.tsx#Icon",
			},
		},
		// set base directory for custom component imports.
		importMap: { baseDir: path.resolve(dirname) },
		meta: {
			// configure the favicon for the admin dashboard.
			icons: [
				{
					fetchPriority: "high",
					rel: "icon",
					sizes: "32x32",
					type: "image/svg+xml",
					url: iconURL,
				},
			],
			// append a suffix to the browser title for all admin pages.
			titleSuffix: " | Mjakazi Connect",
		},
		// set the users collection slug for authentication management.
		user: Users.slug,
	},
	// register all custom collections.
	collections: collections,

	// configure mongodb adapter using the conditionally selected database uri.
	db: mongooseAdapter({ url: databaseURI }),

	// set the default rich text editor to lexical.
	editor: lexical,

	// configure resend as the email delivery provider.
	email: resend,

	// register all global content types.
	globals: globals,

	// load all defined payload plugins.
	plugins: [...plugins],

	// set the payload secret for security, asserting its presence.
	secret: process.env.PAYLOAD_SECRET!,

	// register sharp for image processing and optimization.
	sharp,

	// define the output path for payload's typescript types generation.
	typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },

	jobs: {
		access: {
			run: ({ req }: { req: PayloadRequest }): boolean => {
				// grant access to the jobs endpoint for any logged-in payload user.
				if (req.user) return true;

				// check for authorization header to allow external cron jobs (e.g., vercel cron).
				const authHeader = req.headers.get("authorization");

				// grant access only if the bearer token matches the predefined cron secret.
				return authHeader === `Bearer ${process.env.CRON_SECRET}`;
			},
		},
		// define all recurring scheduled tasks (currently empty).
		tasks: [],
	},
});
