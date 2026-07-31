import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const dirname = path.dirname(__filename);

const nextConfig: NextConfig = {
	allowedDevOrigins: ["fidelity-acorn-charbroil.ngrok-free.dev"],
	images: {
		qualities: [25, 50, 75, 100],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "s3.co.ke",
			},
			{
				protocol: "https",
				hostname: "*.s3.co.ke",
			},
			{
				protocol: "http",
				hostname: "localhost",
				port: "3000",
			},
			{
				protocol: "https",
				hostname: "*.ngrok-free.dev",
			},
		],
	},
	output: "standalone",
	outputFileTracingIncludes: {
		"/*": [
			"node_modules/sharp/**/*",
			"node_modules/@img/**/*",
			"node_modules/.pnpm/sharp@*/**/*",
			"node_modules/.pnpm/@img*/**/*",
		],
	},
	turbopack: {
		root: path.resolve(dirname),
		resolveExtensions: [".mdx", ".tsx", ".ts", ".jsx", ".js", ".mjs", ".json"],
	},

	webpack: (webpackConfig, { dev }) => {
		webpackConfig.resolve.extensionAlias = {
			".cjs": [".cts", ".cjs"],
			".js": [".ts", ".tsx", ".js", ".jsx"],
			".mjs": [".mts", ".mjs"],
		};

		// disable persistent disk caching during development to prevent ArrayBuffer crashes
		if (dev) {
			webpackConfig.cache = false;
		}

		// suppress the "critical dependency" warning from payload cms
		webpackConfig.ignoreWarnings = [
			...(webpackConfig.ignoreWarnings || []),
			{ module: /node_modules\/payload/ },
		];

		return webpackConfig;
	},
};

const configWithPayload = withPayload(nextConfig, { devBundleServerPackages: false });

export { configWithPayload as default };
