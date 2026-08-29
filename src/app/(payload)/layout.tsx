/* THIS FILE WAS GENERATED AUTOMATICALLY BY PAYLOAD. */
/* DO NOT MODIFY IT BECAUSE IT COULD BE REWRITTEN AT ANY TIME. */
/* MODIFIED: added Clerk auth.protect() and role guard — see git history before regenerating. */
import { redirect } from "next/navigation";
import type { ServerFunctionClient } from "payload";
import { ReactNode } from "react";

import { getCurrentUser } from "@/components/admin/get-current-user";
import { DASHBOARD_BY_ROLE } from "@/lib/roles";
import config from "@/payload-config";
import { importMap } from "@/payload-root/admin/importMap.js";

import { auth } from "@clerk/nextjs/server";
import { handleServerFunctions, RootLayout } from "@payloadcms/next/layouts";

import "@payloadcms/next/css";
import "@/payload-root/custom.scss";

type Args = { children: ReactNode };

const serverFunction: ServerFunctionClient = async function (args) {
	"use server";
	return handleServerFunctions({ ...args, config, importMap });
};

const Layout = async ({ children }: Args) => {
	await auth.protect();

	// clerk confirms a session, this confirms the payload role. non-staff go to
	// their own dashboard rather than payload's unauthorized screen, whose log out
	// button cannot clear a clerk session
	const user = await getCurrentUser();

	if (!user) {
		redirect("/sign-in");
	}

	if (user.role !== "admin" && user.role !== "staff") {
		redirect(DASHBOARD_BY_ROLE[user.role]);
	}

	return (
		<RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
			{children}
		</RootLayout>
	);
};

export { Layout as default };
