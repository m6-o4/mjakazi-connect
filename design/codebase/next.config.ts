import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	allowedDevOrigins: ["nella-nonexcepting-emil.ngrok-free.dev"],
	experimental: { workerThreads: false },
	images: {
		qualities: [25, 50, 75, 100],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "mjakaziconnect.co.ke",
			},
			{
				protocol: "https",
				hostname: "*.mjakaziconnect.co.ke",
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
	turbopack: {
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
