import path from "path";
import { fileURLToPath } from "url";
import { globals } from "@/payload/blocks/globals";
import { collections } from "@/payload/collections";
import { Users } from "@/payload/collections/users/schema";
import { mongooseAdapter } from "@payloadcms/db-mongodb";
import { lexical } from "@/payload/fields/lexical";
import { resend } from "@/payload/fields/resend";
import { plugins } from "@/payload/plugins/schema";
import { buildConfig, PayloadRequest } from "payload";
import sharp from "sharp";

const filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(filename);

// retrieve values from the environment variables
const cronSecret = process.env.CRON_SECRET!;
const databaseURL = process.env.DATABASE_URL!;
const payloadSecret = process.env.PAYLOAD_SECRET!;

export default buildConfig({
	admin: {
		components: {
			graphics: { Icon: "/components/payload/icon#Icon" },
			logout: { Button: "/components/admin/custom-signout-button#CustomSignOutButton" },
			providers: ["/components/admin/clerk-admin-provider#ClerkAdminProvider"],
		},
		importMap: {
			baseDir: path.resolve(dirname),
		},
		livePreview: {
			breakpoints: [
				{ label: "Mobile", name: "mobile", width: 375, height: 667 },
				{ label: "Tablet", name: "tablet", width: 768, height: 1024 },
				{ label: "Desktop", name: "desktop", width: 1440, height: 900 },
			],
		},
		meta: {
			icons: [
				{
					fetchPriority: "high",
					rel: "icon",
					sizes: "32x32",
					type: "image/png",
					url: "/favicon.png",
				},
			],

			// append a suffix to the browser title for all admin pages
			titleSuffix: " | Superior Software Solutions",
		},

		// set the users collection slug for authentication management
		user: Users.slug,
	},
	collections: collections,
	db: mongooseAdapter({ url: databaseURL }),
	editor: lexical,
	email: resend,
	globals: globals,
	jobs: {
		access: {
			run: ({ req }: { req: PayloadRequest }): boolean => {
				// staff may trigger the queue from the admin panel
				if (req.user?.role === "admin" || req.user?.role === "editor") return true;

				const secret = cronSecret;
				if (!secret) return false;

				// otherwise require the cron secret as a bearer token, for an
				// external scheduler hitting /api/payload-jobs/run directly
				const authHeader = req.headers.get("authorization");
				return authHeader === `Bearer ${secret}`;
			},
		},
		autoRun: [{ cron: "* * * * *", limit: 10 }],
		tasks: [],
	},
	plugins: [...plugins],
	secret: payloadSecret,
	sharp,
	typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
});
